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

  // Popup state now stores an object with the associated tile and the type.
  // Also store the mouse position for proper placement.
  const [quickPopup, setQuickPopup] = useState(null); // { type, tile }
  const [detailedPopup, setDetailedPopup] = useState(null); // { type, tile }
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

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

  // Auto-dismiss popups after 5 seconds.
  useEffect(() => {
    if (quickPopup) {
      const timer = setTimeout(() => setQuickPopup(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [quickPopup]);
  useEffect(() => {
    if (detailedPopup) {
      const timer = setTimeout(() => setDetailedPopup(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [detailedPopup]);

  // Helper functions to show pop-ups.
  const showQuickPopup = (type, tile, pos) => {
    setQuickPopup({ type, tile });
    setPopupPos(pos);
  };
  const showDetailedPopup = (type, tile, pos) => {
    setDetailedPopup({ type, tile });
    setPopupPos(pos);
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
      // Ensure pop-ups appear at the current mouse position.
      setPopupPos(pos);
      if (placementMode && type === "single") {
        // In placement mode, single click places a building.
        handleTilePlacement(tile);
        return;
      }
      if (type === "single") {
        // Single click: show quick popup with title info.
        if (tile) {
          if (tile.resource_nodes && tile.resource_nodes.length > 0) {
            showQuickPopup("resource_node", tile, pos);
          } else {
            const building = buildings.find(
              (b) =>
                b.coordinate_x === tile.coordinate_x &&
                b.coordinate_y === tile.coordinate_y
            );
            if (building) {
              showQuickPopup("building", tile, pos);
            } else {
              showQuickPopup("tile", tile, pos);
            }
          }
        }
      } else if (type === "double") {
        // Double click: toggle assignment and update quick popup.
        if (tile.resource_nodes && tile.resource_nodes.length > 0) {
          const node = tile.resource_nodes[0];
          try {
            await toggleAssignment({
              settlement_id: id,
              object_type: "resource_node",
              object_id: node.id,
            });
            const updatedTiles = await loadMapTiles();
            await loadSettlementData();
            if (
              villagerPanelRef.current &&
              typeof villagerPanelRef.current.refreshVillagers === "function"
            ) {
              villagerPanelRef.current.refreshVillagers();
            }
            // Look up the updated tile using its coordinates.
            const updatedTile = updatedTiles.find(
              (t) =>
                t.coordinate_x === tile.coordinate_x &&
                t.coordinate_y === tile.coordinate_y
            );
            if (updatedTile) {
              showQuickPopup("resource_node", updatedTile, pos);
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
              showQuickPopup("building", tile, pos);
            } catch (err) {
              console.error(
                err.response?.data?.error || "Error toggling building assignment."
              );
            }
          }
        }
      } else if (type === "right") {
        // Right click: show detailed popup with extra info.
        if (tile.resource_nodes && tile.resource_nodes.length > 0) {
          showDetailedPopup("resource_node", tile, pos);
        } else {
          const building = buildings.find(
            (b) =>
              b.coordinate_x === tile.coordinate_x &&
              b.coordinate_y === tile.coordinate_y
          );
          showDetailedPopup(building ? "building" : "tile", tile, pos);
        }
      }
    },
    [placementMode, id, buildings, loadMapTiles, loadSettlementData, villagerPanelRef]
  );

  // Popup render functions now use the stored tile from the popup state
  const renderQuickPopupContent = () => {
    if (!quickPopup) return null;
    const { type, tile } = quickPopup;
    if (type === "resource_node") {
      // Look up updated tile from mapTiles
      const updatedTile =
        mapTiles.find(
          (t) =>
            t.coordinate_x === tile.coordinate_x &&
            t.coordinate_y === tile.coordinate_y
        ) || tile;
      const node = updatedTile.resource_nodes ? updatedTile.resource_nodes[0] : null;
      if (!node) return null;
      return (
        <>
          <strong>{node.name}</strong>
          <br />
          Status: {node.gatherer_id ? "Gathering" : "Idle"}
          <br />
          Remaining: {node.quantity} / {node.max_quantity}
        </>
      );
    } else if (type === "building") {
      const updatedBuilding = buildings.find(
        (b) =>
          b.coordinate_x === tile.coordinate_x &&
          b.coordinate_y === tile.coordinate_y
      );
      if (!updatedBuilding) return null;
      return (
        <>
          <strong>{updatedBuilding.building_type.toUpperCase()}</strong>
          <br />
          Assigned: {updatedBuilding.assigned ? updatedBuilding.assigned : "Unoccupied"}
        </>
      );
    } else if (type === "tile") {
      const updatedTile =
        mapTiles.find(
          (t) =>
            t.coordinate_x === tile.coordinate_x &&
            t.coordinate_y === tile.coordinate_y
        ) || tile;
      return (
        <>
          <strong>{updatedTile.terrain_type ? updatedTile.terrain_type.toUpperCase() : "TILE"}</strong>
        </>
      );
    }
  };

  const renderDetailedPopupContent = () => {
    if (!detailedPopup) return null;
    const { type, tile } = detailedPopup;
    if (type === "resource_node") {
      const updatedTile =
        mapTiles.find(
          (t) =>
            t.coordinate_x === tile.coordinate_x &&
            t.coordinate_y === tile.coordinate_y
        ) || tile;
      const node = updatedTile.resource_nodes ? updatedTile.resource_nodes[0] : null;
      if (!node) return null;
      return (
        <>
          {node.lore}
          <br />
          Current Quantity: {node.quantity} / {node.max_quantity}
        </>
      );
    } else if (type === "building") {
      const updatedBuilding = buildings.find(
        (b) =>
          b.coordinate_x === tile.coordinate_x &&
          b.coordinate_y === tile.coordinate_y
      );
      if (!updatedBuilding) return null;
      return (
        <>
          {updatedBuilding.description || "No further details available."}
        </>
      );
    } else if (type === "tile") {
      const updatedTile =
        mapTiles.find(
          (t) =>
            t.coordinate_x === tile.coordinate_x &&
            t.coordinate_y === tile.coordinate_y
        ) || tile;
      return (
        <>
          {updatedTile.description || "No description available."}
        </>
      );
    }
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
      {quickPopup && (
        <Box
          position="absolute"
          top={`${popupPos.y}px`}
          left={`${popupPos.x}px`}
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
          onMouseLeave={() => setQuickPopup(null)}
        >
          {renderQuickPopupContent()}
        </Box>
      )}

      {/* Detailed Popup (Right Click) */}
      {detailedPopup && (
        <Box
          position="absolute"
          top={`${popupPos.y}px`}
          left={`${popupPos.x}px`}
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
          onMouseLeave={() => setDetailedPopup(null)}
        >
          {renderDetailedPopupContent()}
        </Box>
      )}
    </Flex>
  );
};

export default SettlementView;
