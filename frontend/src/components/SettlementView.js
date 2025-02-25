// src/components/SettlementView.js
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
import { useParams } from "react-router-dom";
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

// Local constant with building options including cost details
const BUILDING_OPTIONS = {
  house: { name: "House", cost: { wood: 10, stone: 10 } },
  farmhouse: { name: "Farmhouse", cost: { wood: 10, stone: 10 } },
  lumber_mill: { name: "Lumber Mill", cost: { wood: 10, stone: 0 } },
  quarry: { name: "Quarry", cost: { wood: 0, stone: 10 } },
  warehouse: { name: "Warehouse", cost: { wood: 100, stone: 100 } },
};

const SettlementView = () => {
  const { id } = useParams();
  const [settlementData, setSettlementData] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [mapTiles, setMapTiles] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Popup state.
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

  // Create a ref for VillagerPanel.
  const villagerPanelRef = useRef(null);
  const autoRefreshInterval = useRef(null);

  // Load settlement data.
  const loadSettlementData = useCallback(async () => {
    try {
      console.debug("[SettlementView] Fetching settlement data for ID:", id);
      const data = await fetchSettlement(id);
      console.debug("[SettlementView] Settlement data fetched:", data);
      setSettlementData(data);
      setBuildings(data.buildings || []);
      setError(null);
    } catch (err) {
      console.error("[SettlementView] Error fetching settlement details:", err);
      setError("Error fetching settlement details.");
    }
  }, [id]);

  const loadGameState = useCallback(async () => {
    try {
      console.debug("[SettlementView] Fetching game state.");
      const data = await fetchGameState();
      console.debug("[SettlementView] Game state:", data);
      setGameState(data);
    } catch (err) {
      console.error("[SettlementView] Error fetching game state:", err);
    }
  }, []);

  const loadMapTiles = useCallback(async () => {
    try {
      console.debug("[SettlementView] Fetching map tiles for settlement ID:", id);
      const tiles = await fetchMapTiles(id);
      console.debug("[SettlementView] Map tiles fetched:", tiles);
      setMapTiles(tiles);
    } catch (err) {
      console.error("[SettlementView] Error fetching map tiles:", err);
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
    autoRefreshInterval.current = setInterval(() => {
      if (!placementMode) {
        loadSettlementData();
      }
      loadGameState();
      loadMapTiles();
    }, 1000);
    return () => clearInterval(autoRefreshInterval.current);
  }, [id, placementMode, loadSettlementData, loadGameState, loadMapTiles]);

  const handleTileClick = useCallback(
    async ({ tile_x, tile_y }) => {
      if (!placementMode) return;
      if (selectedBuildingType) {
        try {
          console.debug(
            "[SettlementView] Placing building of type",
            selectedBuildingType,
            "at tile (",
            tile_x,
            tile_y,
            ")"
          );
          const payload = {
            settlement_id: id,
            building_type: selectedBuildingType,
            tile_x,
            tile_y,
          };
          const response = await placeBuilding(payload);
          console.debug(
            "[SettlementView] Building placed with response:",
            response
          );
          setPlacementMessage(`Building placed successfully! ID: ${response.building_id}`);
          setPlacementError("");
          await loadSettlementData();
          setPlacementMode(false);
        } catch (err) {
          console.error("[SettlementView] Error placing building:", err);
          setPlacementError(err.response?.data?.error || "Error placing building.");
          setPlacementMessage("");
        }
      }
    },
    [placementMode, selectedBuildingType, id, loadSettlementData]
  );

  const handleTileInteraction = useCallback(
    ({ type, tile, pos }) => {
      console.debug("[SettlementView] Tile interaction:", type, tile, pos);
      if (placementMode && type === "single") {
        handleTileClick({
          tile_x: tile.coordinate_x,
          tile_y: tile.coordinate_y,
        });
        return;
      }
      if (type === "single") {
        if (tile.resource_nodes && tile.resource_nodes.length > 0) {
          console.debug("[SettlementView] Single click on resource node tile:", tile);
          setQuickPopupInfo({ type: "resource_node", tile });
        } else {
          const building = buildings.find(
            (b) =>
              b.coordinate_x === tile.coordinate_x &&
              b.coordinate_y === tile.coordinate_y
          );
          if (building) {
            console.debug("[SettlementView] Single click on building tile:", building);
            setQuickPopupInfo({ type: "building", building });
          } else {
            setQuickPopupInfo({ type: "tile", tile });
          }
        }
        setQuickPopupPos(pos);
      } else if (type === "double") {
        if (tile.resource_nodes && tile.resource_nodes.length > 0) {
          const node = tile.resource_nodes[0];
          console.debug("[SettlementView] Double click on resource node:", node);
          toggleAssignment({
            settlement_id: id,
            object_type: "resource_node",
            object_id: node.id,
          })
            .then((response) => {
              console.debug("[SettlementView] Toggle assignment response:", response.message);
              loadMapTiles();
              loadSettlementData();
              if (
                villagerPanelRef.current &&
                typeof villagerPanelRef.current.refreshVillagers === "function"
              ) {
                console.debug(
                  "[SettlementView] Refreshing villager panel after toggle assignment."
                );
                villagerPanelRef.current.refreshVillagers();
              }
            })
            .catch((err) =>
              console.error(err.response?.data?.error || "Error toggling resource assignment.")
            );
        } else {
          const building = buildings.find(
            (b) =>
              b.coordinate_x === tile.coordinate_x &&
              b.coordinate_y === tile.coordinate_y
          );
          if (building) {
            console.debug("[SettlementView] Double click on building:", building);
            toggleAssignment({
              settlement_id: id,
              object_type: "building",
              object_id: building.id,
            })
              .then((response) => {
                console.debug("[SettlementView] Toggle assignment response:", response.message);
                loadSettlementData();
              })
              .catch((err) =>
                console.error(err.response?.data?.error || "Error toggling building assignment.")
              );
          }
        }
      } else if (type === "right") {
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
    [placementMode, buildings, id, loadMapTiles, loadSettlementData, handleTileClick]
  );

  const renderQuickPopupContent = () => {
    if (!quickPopupInfo) return null;
    if (quickPopupInfo.type === "resource_node") {
      const node = quickPopupInfo.tile.resource_nodes[0];
      const status = node.gatherer_id ? "Gathering" : "Idle";
      return (
        <>
          <strong>{node.name}</strong>
          <br />
          Status: {status}
          <br />
          Remaining: {node.quantity} / {node.max_quantity}
        </>
      );
    } else if (quickPopupInfo.type === "building") {
      const building = quickPopupInfo.building;
      return (
        <>
          <strong>{building ? building.building_type.toUpperCase() : "BUILDING"}</strong>
          <br />
          Assigned: {building && building.assigned ? building.assigned : "Unoccupied"}
        </>
      );
    } else if (quickPopupInfo.type === "tile") {
      return (
        <>
          <strong>{quickPopupInfo.tile.terrain_type ? quickPopupInfo.tile.terrain_type.toUpperCase() : "TILE"}</strong>
        </>
      );
    }
    return null;
  };

  const renderDetailedPopupContent = () => {
    if (!detailedPopupInfo) return null;
    const { type, tile } = detailedPopupInfo;
    if (type === "resource_node") {
      const node = tile.resource_nodes[0];
      return (
        <>
          <strong>{node.resource_type.toUpperCase()}</strong>
          <br />
          {node.lore}
        </>
      );
    } else if (type === "building") {
      const building = buildings.find(
        (b) =>
          b.coordinate_x === tile.coordinate_x &&
          b.coordinate_y === tile.coordinate_y
      );
      return (
        <>
          <strong>{building ? building.building_type.toUpperCase() : "BUILDING"}</strong>
          <br />
          {building ? building.description : ""}
        </>
      );
    } else if (type === "tile") {
      return (
        <>
          <strong>{tile.terrain_type ? tile.terrain_type.toUpperCase() : "TILE"}</strong>
          <br />
          {tile.description || "No description available."}
        </>
      );
    }
    return null;
  };

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
        {/* Building Placement Panel */}
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

        {/* Villager Panel */}
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
          {renderQuickPopupContent()}
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
          {renderDetailedPopupContent()}
        </Box>
      )}
    </Flex>
  );
};

export default SettlementView;