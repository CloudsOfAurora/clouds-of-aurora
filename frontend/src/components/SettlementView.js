import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  Flex,
  Text,
  Spinner,
  Button,
  Select,
  FormControl,
  FormLabel,
  Alert,
  Collapse,
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import SettlementMap from "./SettlementMap";
import {
  fetchSettlement,
  fetchGameState,
  placeBuilding,
  fetchMapTiles,
  toggleAssignment,
} from "../api";
import VillagerPanel from "./VillagerPanel";
import EventLog from "./EventLog";

const BUILDING_OPTIONS = {
  house: { name: "House", cost: { wood: 100, stone: 50 } },
  farmhouse: { name: "Farmhouse", cost: { wood: 30, stone: 10 } },
  lumber_mill: { name: "Lumber Mill", cost: { wood: 30, stone: 0 } },
  quarry: { name: "Quarry", cost: { wood: 50, stone: 10 } },
  warehouse: { name: "Warehouse", cost: { wood: 300, stone: 300 } },
};

const SettlementView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [settlementData, setSettlementData] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [mapTiles, setMapTiles] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Popup states.
  const [quickPopupInfo, setQuickPopupInfo] = useState(null);
  const [quickPopupPos, setQuickPopupPos] = useState({ x: 0, y: 0 });
  const [detailedPopupInfo, setDetailedPopupInfo] = useState(null);
  const [detailedPopupPos, setDetailedPopupPos] = useState({ x: 0, y: 0 });

  // Building placement state.
  const [placementMode, setPlacementMode] = useState(false);
  const [selectedBuildingType, setSelectedBuildingType] = useState("");
  const [placementMessage, setPlacementMessage] = useState("");
  const [placementError, setPlacementError] = useState("");
  const [buildingPlacementExpanded, setBuildingPlacementExpanded] = useState(false);

  // Reference for VillagerPanel.
  const villagerPanelRef = useRef(null);

  const loadSettlementData = useCallback(async () => {
    try {
      const data = await fetchSettlement(id);
      setSettlementData(data);
      setBuildings(data.buildings || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching settlement details:", err);
      setError("Error fetching settlement details.");
    }
  }, [id]);

  const loadGameState = useCallback(async () => {
    try {
      const data = await fetchGameState();
      setGameState(data);
    } catch (err) {
      console.error("Error fetching game state:", err);
    }
  }, []);

  const loadMapTiles = useCallback(async () => {
    try {
      const tiles = await fetchMapTiles(id);
      setMapTiles(tiles);
      return tiles;
    } catch (err) {
      console.error("Error fetching map tiles:", err);
      return [];
    }
  }, [id]);

  useEffect(() => {
    const loadData = async () => {
      await loadSettlementData();
      await loadGameState();
      await loadMapTiles();
      setLoading(false);
    };
    loadData();
    const interval = setInterval(() => {
      if (!placementMode) loadSettlementData();
      loadGameState();
      loadMapTiles();
    }, 1000);
    return () => clearInterval(interval);
  }, [id, placementMode, loadSettlementData, loadGameState, loadMapTiles]);

  // Auto-dismiss quick popup after 5 seconds.
  useEffect(() => {
    if (quickPopupInfo) {
      const timer = setTimeout(() => setQuickPopupInfo(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [quickPopupInfo]);

  // Auto-dismiss detailed popup after 5 seconds.
  useEffect(() => {
    if (detailedPopupInfo) {
      const timer = setTimeout(() => setDetailedPopupInfo(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [detailedPopupInfo]);

  // Helper: show updated info popup using the latest tile data.
  const showUpdatedInfo = (tile, pos) => {
    if (tile.resource_nodes && tile.resource_nodes.length > 0) {
      setQuickPopupInfo({ type: "resource_node", tile });
    } else {
      const building = buildings.find(
        (b) =>
          b.coordinate_x === tile.coordinate_x &&
          b.coordinate_y === tile.coordinate_y
      );
      if (building) {
        setQuickPopupInfo({ type: "building", building });
      } else {
        setQuickPopupInfo({ type: "tile", tile });
      }
    }
    setQuickPopupPos(pos);
  };

  // Handler for building placement.
  const handleTilePlacement = async (tile) => {
    if (!placementMode || !selectedBuildingType) return;
    try {
      const payload = {
        settlement_id: id,
        building_type: selectedBuildingType,
        tile_x: tile.coordinate_x,
        tile_y: tile.coordinate_y,
      };
      const response = await placeBuilding(payload);
      setPlacementMessage(`Building placed successfully! ID: ${response.building_id}`);
      setPlacementError("");
      await loadSettlementData();
      setPlacementMode(false);
      setBuildingPlacementExpanded(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Error placing building.";
      setPlacementError(errorMsg);
      setPlacementMessage("");
      if (errorMsg.includes("Insufficient resources")) {
        setPlacementMode(false);
      }
    }
  };

  // Unified tile interaction callback.
  const handleTileInteraction = useCallback(
    async ({ type, tile, pos }) => {
      if (placementMode && type === "single") {
        // In placement mode, single click places building.
        handleTilePlacement(tile);
        return;
      }
      if (type === "single") {
        // Single click: simply show the info popup using current state.
        if (tile) {
          if (tile.resource_nodes && tile.resource_nodes.length > 0) {
            setQuickPopupInfo({ type: "resource_node", tile });
          } else {
            const building = buildings.find(
              (b) =>
                b.coordinate_x === tile.coordinate_x &&
                b.coordinate_y === tile.coordinate_y
            );
            if (building) {
              setQuickPopupInfo({ type: "building", building });
            } else {
              setQuickPopupInfo({ type: "tile", tile });
            }
          }
          setQuickPopupPos(pos);
        }
      } else if (type === "double") {
        // Double click: perform assignment toggle then re-fetch updated tile info.
        if (tile.resource_nodes && tile.resource_nodes.length > 0) {
          const node = tile.resource_nodes[0];
          try {
            await toggleAssignment({
              settlement_id: id,
              object_type: "resource_node",
              object_id: node.id,
            });
            // Fetch updated tile info.
            const updatedTiles = await loadMapTiles();
            await loadSettlementData();
            if (
              villagerPanelRef.current &&
              typeof villagerPanelRef.current.refreshVillagers === "function"
            ) {
              villagerPanelRef.current.refreshVillagers();
            }
            const updatedTile = updatedTiles.find(
              (t) => t.coordinate_x === tile.coordinate_x && t.coordinate_y === tile.coordinate_y
            );
            if (updatedTile) {
              showUpdatedInfo(updatedTile, pos);
            }
          } catch (err) {
            console.error(
              err.response?.data?.error || "Error toggling resource assignment."
            );
          }
        } else {
          const building = buildings.find(
            (b) =>
              b.coordinate_x === tile.coordinate_x &&
              b.coordinate_y === tile.coordinate_y
          );
          if (building) {
            try {
              await toggleAssignment({
                settlement_id: id,
                object_type: "building",
                object_id: building.id,
              });
              await loadSettlementData();
              showUpdatedInfo(tile, pos);
            } catch (err) {
              console.error(
                err.response?.data?.error || "Error toggling building assignment."
              );
            }
          }
        }
      } else if (type === "right") {
        // Right click: show detailed popup.
        if (tile.resource_nodes && tile.resource_nodes.length > 0) {
          setDetailedPopupInfo({ type: "resource_node", tile });
        } else {
          const building = buildings.find(
            (b) =>
              b.coordinate_x === tile.coordinate_x &&
              b.coordinate_y === tile.coordinate_y
          );
          setDetailedPopupInfo({ type: building ? "building" : "tile", tile });
        }
        setDetailedPopupPos(pos);
      }
    },
    [
      placementMode,
      id,
      buildings,
      loadMapTiles,
      loadSettlementData,
      villagerPanelRef,
    ]
  );

  if (loading || !settlementData) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }
  if (error) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Alert status="error">
          <Text>{error}</Text>
        </Alert>
      </Flex>
    );
  }

  return (
    <Flex direction="column" height="100vh" position="relative">
      {/* Map Area */}
      <Flex flex="3" bg="gray.100" p={4} justify="center" align="center">
        <SettlementMap
          mapTiles={mapTiles}
          buildings={buildings}
          onTileInteraction={handleTileInteraction}
        />
      </Flex>

      {/* Resource Count, Net Gain/Loss & Happiness */}
      <Box bg="gray.200" p={2} textAlign="center">
        <Text fontSize="lg">
          Food: {Number(settlementData.food).toFixed(1)} (
          {settlementData.net_food_rate >= 0 ? "+" : ""}
          {Number(settlementData.net_food_rate || 0).toFixed(1)}) | Wood: {Number(settlementData.wood).toFixed(1)} (
          {settlementData.net_wood_rate >= 0 ? "+" : ""}
          {Number(settlementData.net_wood_rate || 0).toFixed(1)}) | Stone: {Number(settlementData.stone).toFixed(1)} (
          {settlementData.net_stone_rate >= 0 ? "+" : ""}
          {Number(settlementData.net_stone_rate || 0).toFixed(1)}) | Magic: {Number(settlementData.magic).toFixed(1)} (
          {settlementData.net_magic_rate >= 0 ? "+" : ""}
          {Number(settlementData.net_magic_rate || 0).toFixed(1)})
          {settlementData.current_season && (
            <span> | Season: {settlementData.current_season}</span>
          )}
          {settlementData.popularity_index !== undefined && (
            <span> | Happiness: {settlementData.popularity_index}</span>
          )}
        </Text>
      </Box>

      {/* Scrollable Info Panel */}
      <Box flex="2" bg="gray.200" p={4} overflowY="auto">
        {/* Villager Panel (on top) */}
        <Box mb={4} p={2} bg="white" borderRadius="md">
          <VillagerPanel
            ref={villagerPanelRef}
            settlementId={id}
            availableBuildings={buildings}
            onAssignmentSuccess={loadSettlementData}
            currentTick={gameState ? gameState.tick_count : null}
            settlementPopularity={settlementData.popularity_index}
          />
        </Box>

        {/* Building Placement Panel (below) */}
        <Box mb={4} p={2} bg="white" borderRadius="md">
          <Box
            as="button"
            width="100%"
            textAlign="left"
            fontWeight="bold"
            onClick={() => setBuildingPlacementExpanded(!buildingPlacementExpanded)}
            mb={2}
          >
            Place a building {buildingPlacementExpanded ? "▲" : "▼"}
          </Box>
          <Collapse in={buildingPlacementExpanded} animateOpacity>
            <FormControl mb={2}>
              <FormLabel>Select Building Type</FormLabel>
              <Select
                placeholder="Select building type"
                value={selectedBuildingType}
                onChange={(e) => setSelectedBuildingType(e.target.value)}
              >
                {Object.entries(BUILDING_OPTIONS).map(([key, option]) => (
                  <option key={key} value={key}>
                    {option.name} (Wood: {option.cost.wood}, Stone: {option.cost.stone})
                  </option>
                ))}
              </Select>
            </FormControl>
            <Button
              colorScheme="teal"
              onClick={() => setPlacementMode(!placementMode)}
              mb={2}
            >
              {placementMode ? "Cancel Placement Mode" : "Enter Placement Mode"}
            </Button>
            {placementError && (
              <Alert status="error" mt={2}>
                <Text>{placementError}</Text>
              </Alert>
            )}
            {placementMessage && (
              <Alert status="success" mt={2}>
                <Text>{placementMessage}</Text>
              </Alert>
            )}
            {placementMode && (
              <Text mt={2}>
                Click on the map above to select a tile for your building.
              </Text>
            )}
          </Collapse>
        </Box>

        {/* Events Panel */}
        <Box p={2} bg="white" borderRadius="md">
          <EventLog settlementId={id} />
        </Box>
      </Box>

      {/* Quick Popup (Left Click) */}
      {quickPopupInfo && (
        <Box
          position="absolute"
          top={`${quickPopupPos.y}px`}
          left={`${quickPopupPos.x}px`}
          transform="translate(-50%, -110%)"
          pointerEvents="auto"
          zIndex="20"
          bg="gray.700"
          color="white"
          p="2"
          borderRadius="md"
          boxShadow="md"
          fontSize="sm"
          maxW="200px"
          textAlign="center"
          whiteSpace="normal"
          wordBreak="break-word"
          onMouseLeave={() => setQuickPopupInfo(null)}
        >
          {quickPopupInfo.type === "resource_node" && (
            <>
              <strong>{quickPopupInfo.tile.resource_nodes[0].name}</strong>
              <br />
              Status: {quickPopupInfo.tile.resource_nodes[0].gatherer_id ? "Gathering" : "Idle"}
              <br />
              Remaining: {quickPopupInfo.tile.resource_nodes[0].quantity} / {quickPopupInfo.tile.resource_nodes[0].max_quantity}
            </>
          )}
          {quickPopupInfo.type === "building" && (
            <>
              <strong>{quickPopupInfo.building.building_type.toUpperCase()}</strong>
              <br />
              Assigned: {quickPopupInfo.building.assigned ? quickPopupInfo.building.assigned : "Unoccupied"}
            </>
          )}
          {quickPopupInfo.type === "tile" && (
            <>
              <strong>{quickPopupInfo.tile.terrain_type ? quickPopupInfo.tile.terrain_type.toUpperCase() : "TILE"}</strong>
            </>
          )}
        </Box>
      )}

      {/* Detailed Popup (Right Click) */}
      {detailedPopupInfo && (
        <Box
          position="absolute"
          top={`${detailedPopupPos.y}px`}
          left={`${detailedPopupPos.x}px`}
          transform="translate(-50%, -110%)"
          zIndex="30"
          bg="blue.800"
          color="white"
          p="3"
          borderRadius="md"
          boxShadow="md"
          fontSize="sm"
          maxW="250px"
          textAlign="center"
          whiteSpace="normal"
          wordBreak="break-word"
          onMouseLeave={() => setDetailedPopupInfo(null)}
        >
          {detailedPopupInfo.type === "resource_node" && (
            <>
              <strong>{detailedPopupInfo.tile.resource_nodes[0].resource_type.toUpperCase()}</strong>
              <br />
              {detailedPopupInfo.tile.resource_nodes[0].lore}
            </>
          )}
          {detailedPopupInfo.type === "building" && (
            <>
              <strong>
                {buildings.find(
                  (b) =>
                    b.coordinate_x === detailedPopupInfo.tile.coordinate_x &&
                    b.coordinate_y === detailedPopupInfo.tile.coordinate_y
                )?.building_type.toUpperCase() || "BUILDING"}
              </strong>
              <br />
              {buildings.find(
                (b) =>
                  b.coordinate_x === detailedPopupInfo.tile.coordinate_x &&
                  b.coordinate_y === detailedPopupInfo.tile.coordinate_y
              )?.description || ""}
            </>
          )}
          {detailedPopupInfo.type === "tile" && (
            <>
              <strong>{detailedPopupInfo.tile.terrain_type ? detailedPopupInfo.tile.terrain_type.toUpperCase() : "TILE"}</strong>
              <br />
              {detailedPopupInfo.tile.description || "No description available."}
            </>
          )}
        </Box>
      )}
    </Flex>
  );
};

export default SettlementView;
