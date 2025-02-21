// src/components/SettlementView.js
import React, { useEffect, useState, useRef } from "react";
import { Box, Flex, Text, Spinner, Button, Select, FormControl, FormLabel, Alert } from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import SettlementCanvas from "./SettlementCanvas";
import { fetchSettlement, fetchGameState, placeBuilding } from "../api";
import VillagerPanel from "./VillagerPanel";
import EventLog from "./EventLog";

const SettlementView = () => {
  const { id } = useParams(); // Settlement ID from URL
  const [settlementData, setSettlementData] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // For building placement via the main map:
  const [placementMode, setPlacementMode] = useState(false);
  const [selectedBuildingType, setSelectedBuildingType] = useState("");
  const [selectedTile, setSelectedTile] = useState(null);
  const [placementMessage, setPlacementMessage] = useState("");
  const [placementError, setPlacementError] = useState("");

  const autoRefreshInterval = useRef(null);

  const loadSettlementData = async () => {
    try {
      const data = await fetchSettlement(id);
      setSettlementData(data);
      setBuildings(data.buildings || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching settlement data:", err);
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

  useEffect(() => {
    const loadData = async () => {
      await loadSettlementData();
      await loadGameState();
      setLoading(false);
    };
    loadData();
    autoRefreshInterval.current = setInterval(() => {
      // Only auto-refresh settlement data if not in placement mode to preserve UI state.
      if (!placementMode) {
        loadSettlementData();
      }
      // Always update game state for current season and tick.
      loadGameState();
    }, 5000);
    return () => clearInterval(autoRefreshInterval.current);
  }, [id, placementMode]);

  const handleTileClick = async ({ tile_x, tile_y }) => {
    if (!placementMode) return;
    setSelectedTile({ tile_x, tile_y });
    if (selectedBuildingType) {
      try {
        const payload = {
          settlement_id: id,
          building_type: selectedBuildingType,
          tile_x,
          tile_y,
        };
        const response = await placeBuilding(payload);
        setPlacementMessage(`Building placed successfully! ID: ${response.building_id}`);
        setPlacementError("");
        loadSettlementData(); // Refresh settlement data after placement
        setPlacementMode(false);
        setSelectedTile(null);
      } catch (err) {
        setPlacementError(err.response?.data?.error || "Error placing building.");
        setPlacementMessage("");
      }
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
    <Flex direction="column" height="100vh">
      {/* Map Area centered */}
      <Flex flex="3" bg="gray.100" p={4} justify="center" align="center">
        <SettlementCanvas 
          buildings={buildings} 
          placementMode={placementMode} 
          selectedTile={selectedTile} 
          onTileClick={handleTileClick} 
        />
      </Flex>
      
      {/* Resource Count and Current Season below the map */}
      <Box bg="gray.200" p={2} textAlign="center">
        <Text fontSize="lg">
          Resources - Food: {Number(settlementData.food).toFixed(1)} (
          {settlementData.net_food_rate !== undefined
            ? settlementData.net_food_rate >= 0
              ? `(+${Number(settlementData.net_food_rate).toFixed(1)})`
              : `(${Number(settlementData.net_food_rate).toFixed(1)})`
            : "(0.0)"}
          ) | Wood: {Number(settlementData.wood).toFixed(1)} (
          {settlementData.net_wood_rate !== undefined
            ? settlementData.net_wood_rate >= 0
              ? `(+${Number(settlementData.net_wood_rate).toFixed(1)})`
              : `(${Number(settlementData.net_wood_rate).toFixed(1)})`
            : "(0.0)"}
          ) | Stone: {Number(settlementData.stone).toFixed(1)} (
          {settlementData.net_stone_rate !== undefined
            ? settlementData.net_stone_rate >= 0
              ? `(+${Number(settlementData.net_stone_rate).toFixed(1)})`
              : `(${Number(settlementData.net_stone_rate).toFixed(1)})`
            : "(0.0)"}
          )
          {settlementData.current_season && <span> | Season: {settlementData.current_season}</span>}
        </Text>
      </Box>
      
      {/* Info Panels */}
      <Box flex="2" bg="gray.200" p={4} overflowY="auto">
        {/* Building Placement Controls */}
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
            </Select>
          </FormControl>
          <Button colorScheme="teal" onClick={() => setPlacementMode(!placementMode)}>
            {placementMode ? "Cancel Placement Mode" : "Enter Placement Mode"}
          </Button>
          {placementError && (
            <Alert status="error" mt={2}>
              {placementError}
            </Alert>
          )}
          {placementMessage && (
            <Alert status="success" mt={2}>
              {placementMessage}
            </Alert>
          )}
          {placementMode && (
            <Text mt={2}>Click directly on the main map to choose a tile for your building.</Text>
          )}
        </Box>
        
        {/* Villager Panel with Inline Assignment */}
        <Box mb={4} p={2} bg="white" borderRadius="md">
          <VillagerPanel
            settlementId={id}
            availableBuildings={buildings}
            onAssignmentSuccess={loadSettlementData}
            currentTick={gameState ? gameState.tick_count : null}
          />
        </Box>
        
        {/* Events Panel */}
        <Box p={2} bg="white" borderRadius="md">
          <EventLog settlementId={id} />
        </Box>
      </Box>
    </Flex>
  );
};

export default SettlementView;
