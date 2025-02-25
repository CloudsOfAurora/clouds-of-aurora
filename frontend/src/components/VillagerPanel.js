// src/components/VillagerPanel.js
import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
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
  Flex,
} from "@chakra-ui/react";
import { fetchSettlers, assignVillager } from "../api";

const VillagerPanel = forwardRef(
  (
    { settlementId, availableBuildings, onAssignmentSuccess, currentTick, settlementPopularity },
    ref
  ) => {
    const [villagers, setVillagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // For inline assignment: track dropdown selection per villager.
    const [assignmentSelections, setAssignmentSelections] = useState({});
    // Track expanded state per villager card.
    const [expanded, setExpanded] = useState({});

    // Wrap loadVillagers in useCallback so it's stable.
    const loadVillagers = useCallback(async () => {
      try {
        console.debug("[VillagerPanel] Loading villagers for settlement", settlementId);
        setLoading(true);
        const allVillagers = await fetchSettlers();
        console.debug("[VillagerPanel] All villagers fetched:", allVillagers);
        // Filter for villagers belonging to the current settlement and not dead.
        const filtered = allVillagers.filter(
          (v) =>
            Number(v.settlement_id) === Number(settlementId) && v.status !== "dead"
        );
        console.debug("[VillagerPanel] Filtered villagers:", filtered);
        setVillagers(filtered);
        setError("");
      } catch (err) {
        console.error("[VillagerPanel] Error fetching villagers:", err);
        setError("Error fetching villager data.");
      } finally {
        setLoading(false);
      }
    }, [settlementId]);

    // Expose refresh method.
    useImperativeHandle(ref, () => ({
      refreshVillagers: loadVillagers,
    }));

    useEffect(() => {
      loadVillagers();
      const interval = setInterval(loadVillagers, 5000);
      return () => clearInterval(interval);
    }, [loadVillagers]);

    const toggleExpand = (villagerId) => {
      console.debug("[VillagerPanel] Toggling expand for villager", villagerId);
      setExpanded((prev) => ({ ...prev, [villagerId]: !prev[villagerId] }));
    };

    const handleSelectChange = (villagerId, buildingId) => {
      console.debug("[VillagerPanel] Villager", villagerId, "selects building", buildingId);
      setAssignmentSelections((prev) => ({ ...prev, [villagerId]: buildingId }));
    };

    const handleAssign = async (villagerId) => {
      const buildingId = assignmentSelections[villagerId];
      if (!buildingId) {
        alert("Please select a building for this villager.");
        return;
      }
      try {
        console.debug("[VillagerPanel] Assigning villager", villagerId, "to building", buildingId);
        const payload = {
          settlement_id: settlementId,
          building_id: buildingId,
          settler_id: villagerId,
        };
        await assignVillager(payload);
        console.debug("[VillagerPanel] Assignment successful for villager", villagerId);
        await loadVillagers(); // Refresh immediately.
        if (onAssignmentSuccess) onAssignmentSuccess();
      } catch (err) {
        console.error("[VillagerPanel] Error assigning villager:", err);
        alert(err.response?.data?.error || "Error assigning villager.");
      }
    };

    // Compute age from birth_tick.
    const computeAge = (birthTick) => {
      if (birthTick == null || currentTick == null) return "N/A";
      return `${currentTick - birthTick} ticks`;
    };

    // Derive assignment label based on nested objects.
    const getAssignmentInfo = (villager) => {
      let status = "Idle";
      if (villager.gathering_resource_node && villager.gathering_resource_node.name) {
        status = `Gathering from ${villager.gathering_resource_node.name}`;
      } else if (villager.assigned_building && villager.assigned_building.building_type) {
        status = `Working in ${villager.assigned_building.building_type}`;
      }
      if (!villager.housing_assigned) {
        status += " (homeless)";
      }
      return status;
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
              console.debug("[VillagerPanel] Processing villager:", villager);
              const assignmentInfo = getAssignmentInfo(villager);
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
                  <Text fontSize="xs">Status: {assignmentInfo}</Text>
                  <Text fontSize="xs">Hunger: {villager.hunger}</Text>
                  <Text fontSize="xs">Experience: {villager.experience}</Text>
                  <Text fontSize="xs">Age: {computeAge(villager.birth_tick)}</Text>
                  {settlementPopularity === 1 && (
                    <Text fontSize="xs" color="green.500">
                      Happy
                    </Text>
                  )}
                </Box>
              );
            })}
          </SimpleGrid>
        )}
      </Box>
    );
  }
);

export default VillagerPanel;
