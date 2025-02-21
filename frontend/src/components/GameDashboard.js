// src/components/GameDashboard.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  List,
  ListItem,
  Spinner,
  Flex,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { fetchGameState, fetchSettlements } from "../api";
import SettlementCanvas from "./SettlementCanvas";

const GameDashboard = () => {
  const [gameState, setGameState] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to load global game state and settlements from the API
  const loadData = async () => {
    try {
      setLoading(true);
      const stateData = await fetchGameState();
      const settlementsData = await fetchSettlements();
      setGameState(stateData);
      setSettlements(settlementsData);
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Error fetching game data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const intervalId = setInterval(loadData, 5000); // Refresh data every 5 seconds
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Flex>
    );
  }

  return (
    <Box p="4" bg="gray.900" color="white" minH="100vh">
      <Heading as="h1" size="2xl">
        Clouds of Aurora
      </Heading>
      {gameState && (
        <Box mt="4">
          <Text fontSize="lg">Tick: {gameState.tick_count}</Text>
          <Text fontSize="lg">Season: {gameState.current_season}</Text>
        </Box>
      )}
      <Heading as="h2" size="xl" mt="8" mb="4">
        Settlements
      </Heading>
      <List spacing="6">
        {settlements.map((settlement) => (
          <ListItem key={settlement.id} p="4" bg="gray.800" borderRadius="md">
            <Heading as="h3" size="md" mb="2">
              {settlement.name}
            </Heading>
            <Text mb="2">
              Food: {settlement.food} | Wood: {settlement.wood} | Stone:{" "}
              {settlement.stone}
            </Text>
            {/* Render the settlement visualization */}
            <SettlementCanvas settlementId={settlement.id} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default GameDashboard;
