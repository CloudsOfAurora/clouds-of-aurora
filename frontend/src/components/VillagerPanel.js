// src/components/VillagerPanel.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  SimpleGrid,
  Select,
  Button,
  Collapse,
  Flex
} from "@chakra-ui/react";
import { fetchSettlers, assignVillager } from "../api";

const VillagerPanel = ({ settlementId, availableBuildings, onAssignmentSuccess, currentTick }) => {
  const [villagers, setVillagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // For inline assignment, track dropdown selection per villager.
  const [assignmentSelections, setAssignmentSelections] = useState({});
  // Track expanded state for each villager card.
  const [expanded, setExpanded] = useState({});

  const loadVillagers = async () => {
    try {
      setLoading(true);
      const allVillagers = await fetchSettlers();
      // Filter out dead settlers
      const filtered = allVillagers.filter(
        (v) => v.settlement_id === Number(settlementId) && v.status !== "dead"
      );
      setVillagers(filtered);
      setError("");
    } catch (err) {
      console.error("Error fetching villagers:", err);
      setError("Error fetching villager data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVillagers();
  }, [settlementId]);

  const toggleExpand = (villagerId) => {
    setExpanded((prev) => ({ ...prev, [villagerId]: !prev[villagerId] }));
  };

  const handleSelectChange = (villagerId, buildingId) => {
    setAssignmentSelections((prev) => ({ ...prev, [villagerId]: buildingId }));
  };

  const handleAssign = async (villagerId) => {
    const buildingId = assignmentSelections[villagerId];
    if (!buildingId) {
      alert("Please select a building for this villager.");
      return;
    }
    try {
      const payload = {
        settlement_id: settlementId,
        building_id: buildingId,
        settler_id: villagerId,
      };
      await assignVillager(payload);
      loadVillagers();
      if (onAssignmentSuccess) onAssignmentSuccess();
    } catch (err) {
      console.error("Error assigning villager:", err);
      alert(err.response?.data?.error || "Error assigning villager.");
    }
  };


  const computeAge = (age) => {
    return age !== null && age !== "N/A" ? `${age} ticks` : "N/A";
  };

  if (loading) {
    return (
      <Box p="4">
        <Spinner size="xl" />
      </Box>
    );
  }
  if (error) {
    return (
      <Box p="4">
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }
  return (
    <Box p="4">
      <Heading as="h3" size="md" mb="4">Villagers</Heading>
      {villagers.length === 0 ? (
        <Text>No villagers found in this settlement.</Text>
      ) : (
        <SimpleGrid columns={[1, 2, 3]} spacing={4}>
          {villagers.map((villager) => (
            <Box key={villager.id} borderWidth="1px" borderRadius="md" p="4">
              <Flex justify="space-between" align="center" onClick={() => toggleExpand(villager.id)} cursor="pointer">
                <Heading as="h4" size="sm">{villager.name}</Heading>
                <Text fontSize="sm">{expanded[villager.id] ? "▲" : "▼"}</Text>
              </Flex>
              <Text>Status: {villager.status}</Text>
              <Text>
                Assigned:{" "}
                {villager.assigned_building__building_type
                  ? villager.assigned_building__building_type
                  : "Unoccupied"}
              </Text>
              <Collapse in={expanded[villager.id]} animateOpacity>
                <Box mt="2">
                  <Text>Mood: {villager.mood}</Text>
                  <Text>Hunger: {villager.hunger}</Text>
                  <Text>Age: {computeAge(villager.age)}</Text>
                  <Text>Experience: {villager.experience}</Text>
                  <Box mt="2">
                    <Text fontSize="sm">Reassign to:</Text>
                    <Select
                      placeholder="Select building"
                      value={assignmentSelections[villager.id] || ""}
                      onChange={(e) => handleSelectChange(villager.id, e.target.value)}
                    >
                      {availableBuildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.building_type} (ID: {b.id}) - {b.assigned}
                        </option>
                      ))}
                    </Select>
                    <Button size="sm" mt="2" colorScheme="teal" onClick={() => handleAssign(villager.id)}>
                      Assign
                    </Button>
                  </Box>
                </Box>
              </Collapse>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default VillagerPanel;
