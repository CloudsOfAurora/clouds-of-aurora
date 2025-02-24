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

const VillagerPanel = ({
  settlementId,
  availableBuildings,
  onAssignmentSuccess,
  currentTick,
  settlementPopularity
}) => {
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

  // Compute age using currentTick and the settler's birth_tick.
  const computeAge = (birthTick) => {
    if (birthTick == null || currentTick == null) return "N/A";
    return `${currentTick - birthTick} ticks`;
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
    <Box p="2">
      <Heading as="h3" size="sm" mb="2">
        Villagers
      </Heading>
      {villagers.length === 0 ? (
        <Text>No villagers found in this settlement.</Text>
      ) : (
        <SimpleGrid columns={[2, 3, 4, 6]} spacing={2}>
          {villagers.map((villager) => {
          // Determine assignment information:
          let assignmentInfo = "Idle";
          let assignedBuilding = null;
          if (villager.status === "working" && villager.assigned_building_id) {
            assignedBuilding = availableBuildings.find(
              (b) => Number(b.id) === Number(villager.assigned_building_id)
            );
            assignmentInfo = assignedBuilding
              ? `Working in ${assignedBuilding.building_type}`
              : "Working";
          }

          // Debugging logs:
          console.log("Settler Data:", villager);
          console.log("Available Buildings:", availableBuildings);
          console.log("Found Assigned Building:", assignedBuilding);

          return (
            <Box key={villager.id} borderWidth="1px" borderRadius="md" p="2">
              <Flex
                justify="space-between"
                align="center"
                onClick={() => toggleExpand(villager.id)}
                cursor="pointer"
              >
                <Heading as="h4" size="xs">
                  {villager.name}
                </Heading>
                <Text fontSize="xs">
                  {expanded[villager.id] ? "▲" : "▼"}
                </Text>
              </Flex>
              <Text fontSize="xs">{assignmentInfo}</Text>
              <Text fontSize="xs">Age: {computeAge(villager.birth_tick)}</Text>
              {settlementPopularity === 1 && (
                <Text fontSize="xs" color="green.500">
                  Happy
                </Text>
              )}
              <Collapse in={expanded[villager.id]} animateOpacity>
                <Box mt="1">
                  <Text fontSize="xs">Reassign:</Text>
                  <Select
                    placeholder="Select building"
                    size="xs"
                    value={assignmentSelections[villager.id] || ""}
                    onChange={(e) =>
                      handleSelectChange(villager.id, e.target.value)
                    }
                  >
                    {availableBuildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.building_type} (ID: {b.id})
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="xs"
                    mt="1"
                    colorScheme="teal"
                    onClick={() => handleAssign(villager.id)}
                  >
                    Assign
                  </Button>
                </Box>
              </Collapse>
            </Box>
          );
        })}


        </SimpleGrid>
      )}
    </Box>
  );
};

export default VillagerPanel;
