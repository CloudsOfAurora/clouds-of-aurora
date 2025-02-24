// src/components/SettlementView.js
import React, { useEffect, useState, useRef } from "react";
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
} from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import SettlementMap from "./SettlementMap";
import { fetchSettlement, fetchGameState, placeBuilding, fetchMapTiles } from "../api";
import VillagerPanel from "./VillagerPanel";
import EventLog from "./EventLog";

const SettlementView = () => {
  const { id } = useParams();
  const [settlementData, setSettlementData] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [mapTiles, setMapTiles] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Popup and hover states.
  const [selectedTileInfo, setSelectedTileInfo] = useState(null);
  const [tileTooltipPos, setTileTooltipPos] = useState({ x: 0, y: 0 });

  // Building placement states
  const [placementMode, setPlacementMode] = useState(false);
  const [selectedBuildingType, setSelectedBuildingType] = useState("");
  const [selectedTile, setSelectedTile] = useState(null);
  const [placementMessage, setPlacementMessage] = useState("");
  const [placementError, setPlacementError] = useState("");

  // Pop-up states for building and tile info
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [buildingTooltipPos, setBuildingTooltipPos] = useState({ x: 0, y: 0 });


  const autoRefreshInterval = useRef(null);

  const loadSettlementData = async () => {
    try {
      const data = await fetchSettlement(id);
      setSettlementData(data);
      setBuildings(data.buildings || []);
      setError(null);
    } catch (err) {
      setError("Error fetching settlement details.");
    }
  };

  const loadGameState = async () => {
    try {
      const data = await fetchGameState();
      setGameState(data);
    } catch (err) {
      console.error("Error fetching game state:", err);
    }
  };

  const loadMapTiles = async () => {
    try {
      const tiles = await fetchMapTiles(id);
      setMapTiles(tiles);
    } catch (err) {
      console.error("Error fetching map tiles:", err);
    }
  };

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
    }, 5000);
    return () => clearInterval(autoRefreshInterval.current);
  }, [id, placementMode]);

  const handleTileClick = async ({ tile_x, tile_y }) => {
    if (!placementMode) return;
    setSelectedTile({ tile_x, tile_y });
    if (selectedBuildingType) {
      try {
        const payload = { settlement_id: id, building_type: selectedBuildingType, tile_x, tile_y };
        const response = await placeBuilding(payload);
        setPlacementMessage(`Building placed successfully! ID: ${response.building_id}`);
        setPlacementError("");
        await loadSettlementData();
        setPlacementMode(false);
        setSelectedTile(null);
      } catch (err) {
        setPlacementError(err.response?.data?.error || "Error placing building.");
        setPlacementMessage("");
      }
    }
  };

  const handleResourceNodeClick = (tile, pos) => {
    setSelectedTileInfo(tile); // We'll use selectedTileInfo to display info.
    setTileTooltipPos(pos);
    // Optionally, clear building info if any.
    setSelectedBuilding(null);
    // Auto-clear after 2 seconds.
    setTimeout(() => setSelectedTileInfo(null), 2000);
  };

  const handleBuildingClick = (building, pos) => {
    setSelectedBuilding(building);
    setBuildingTooltipPos(pos);
    setSelectedTileInfo(null);
    // Clear building pop-up after 2 seconds
    setTimeout(() => setSelectedBuilding(null), 2000);
  };

  const handleTileInfoClick = (tile, pos) => {
    setSelectedTileInfo(tile);
    setTileTooltipPos(pos);
    setSelectedBuilding(null);
    // Clear tile pop-up after 2 seconds
    setTimeout(() => setSelectedTileInfo(null), 2000);
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
        <Alert status="error"><Text>{error}</Text></Alert>
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
          onTileClick={placementMode ? handleTileClick : undefined}
          onBuildingClick={!placementMode ? handleBuildingClick : undefined}
          onTileInfoClick={!placementMode ? handleTileInfoClick : undefined}
          onResourceNodeClick={!placementMode ? handleResourceNodeClick : undefined}
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
          {Number(settlementData.net_stone_rate || 0).toFixed(1)}) 
          {settlementData.current_season && <span> | Season: {settlementData.current_season}</span>}
          {settlementData.popularity_index !== undefined && <span> | Happiness: {settlementData.popularity_index}</span>}
        </Text>
      </Box>


      {/* Scrollable Info Panel */}
      <Box flex="2" bg="gray.200" p={4} overflowY="auto">
        {/* Building Placement Panel */}
        <Box mb={4} p={2} bg="white" borderRadius="md">
          <FormControl mb={2}>
            <FormLabel>Select Building Type</FormLabel>
            <Select
              placeholder="Select building type"
              value={selectedBuildingType}
              onChange={(e) => setSelectedBuildingType(e.target.value)}
            >
              <option value="house">House</option>
              <option value="farmhouse">Farmhouse</option>
              <option value="lumber_mill">Lumber Mill</option>
              <option value="quarry">Quarry</option>
              <option value="warehouse">Warehouse</option>
            </Select>
          </FormControl>
          <Button colorScheme="teal" onClick={() => setPlacementMode(!placementMode)} mb={2}>
            {placementMode ? "Cancel Placement Mode" : "Enter Placement Mode"}
          </Button>
          {placementError && (
            <Alert status="error" mt={2}><Text>{placementError}</Text></Alert>
          )}
          {placementMessage && (
            <Alert status="success" mt={2}><Text>{placementMessage}</Text></Alert>
          )}
          {placementMode && (
            <Text mt={2}>Click on the map above to select a tile for your building.</Text>
          )}
        </Box>

        {/* Villager Panel */}
        <Box mb={4} p={2} bg="white" borderRadius="md">
        <VillagerPanel
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

      {/* Building Info Pop-up */}
      {selectedBuilding && (
        <Box
          position="absolute"
          top={`${buildingTooltipPos.y}px`}
          left={`${buildingTooltipPos.x}px`}
          transform="translate(-50%, -110%)"
          pointerEvents="none"
          zIndex="20"
          bg="gray.800"
          color="white"
          p="5"
          borderRadius="md"
          boxShadow="md"
          fontSize="sm"
          maxW="200px"
          textAlign="center"
          whiteSpace="normal"
          wordBreak="break-word"
        >
          <strong>{selectedBuilding.building_type.toUpperCase()}</strong>
          <br />
          {selectedBuilding.description || "No additional info available."}
        </Box>
      )}

      {/* Tile Info / Resource Node Pop-up */}
      {selectedTileInfo && (
        <Box
          position="absolute"
          top={`${tileTooltipPos.y}px`}
          left={`${tileTooltipPos.x}px`}
          transform="translate(-50%, -110%)"
          pointerEvents="none"
          zIndex="20"
          bg="gray.800"
          color="white"
          p="2"
          borderRadius="md"
          boxShadow="md"
          fontSize="sm"
          maxW="200px"
          textAlign="center"
          whiteSpace="normal"
          wordBreak="break-word"
        >
          {selectedTileInfo.resource_nodes && selectedTileInfo.resource_nodes.length > 0 ? (
            <>
              <strong>{selectedTileInfo.resource_nodes[0].name}</strong>
              <br />
              {selectedTileInfo.resource_nodes[0].lore || "No lore available."}
            </>
          ) : (
            <>
              <strong>{selectedTileInfo.terrain_type.toUpperCase()}</strong>
              <br />
              {selectedTileInfo.description || "No description available."}
            </>
          )}
        </Box>
      )}
    </Flex>
  );
};

export default SettlementView;
