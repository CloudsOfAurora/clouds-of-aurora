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
    const [expanded, setExpanded] = useState({}); // initially empty (collapsed)

    const loadVillagers = useCallback(async () => {
      try {
        console.debug("[VillagerPanel] Loading villagers for settlement", settlementId);
        setLoading(true);
        const allVillagers = await fetchSettlers();
        const filtered = allVillagers.filter(
          (v) =>
            Number(v.settlement_id) === Number(settlementId) && v.status !== "dead"
        );
        setVillagers(filtered);
        setError("");
      } catch (err) {
        console.error("[VillagerPanel] Error fetching villagers:", err);
        setError("Error fetching villager data.");
      } finally {
        setLoading(false);
      }
    }, [settlementId]);

    useImperativeHandle(ref, () => ({
      refreshVillagers: loadVillagers,
    }));

    useEffect(() => {
      loadVillagers();
      const interval = setInterval(loadVillagers, 5000);
      return () => clearInterval(interval);
    }, [loadVillagers]);

    const toggleExpand = (villagerId) => {
      setExpanded((prev) => ({ ...prev, [villagerId]: !prev[villagerId] }));
    };

    const computeAge = (birthTick) => {
      if (birthTick == null || currentTick == null) return "N/A";
      return `${currentTick - birthTick} ticks`;
    };

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
            {villagers.map((villager) => (
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
                <Text fontSize="xs">Status: {getAssignmentInfo(villager)}</Text>
                {expanded[villager.id] === true && (
                  <>
                    <Text fontSize="xs">Hunger: {villager.hunger}</Text>
                    <Text fontSize="xs">Experience: {villager.experience}</Text>
                    <Text fontSize="xs">Age: {computeAge(villager.birth_tick)}</Text>
                  </>
                )}
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>
    );
  }
);

export default VillagerPanel;
