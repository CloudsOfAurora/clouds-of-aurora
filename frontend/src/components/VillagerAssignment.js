// src/components/VillagerAssignment.js
import React, { useEffect, useState } from "react";
import { Box, Button, Select, FormControl, FormLabel, Alert, AlertIcon } from "@chakra-ui/react";
import { fetchSettlers, fetchSettlements, assignVillager } from "../api";

const VillagerAssignment = ({ settlementId, onAssignmentSuccess }) => {
  const [idleVillagers, setIdleVillagers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedVillager, setSelectedVillager] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [loading, setLoading] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentError, setAssignmentError] = useState("");

  const loadVillagers = async () => {
    try {
      const allVillagers = await fetchSettlers();
      const filtered = allVillagers.filter(
        (v) => v.settlement_id === Number(settlementId) && v.status === "idle"
      );
      setIdleVillagers(filtered);
    } catch (err) {
      console.error("Error fetching villagers:", err);
    }
  };

  const loadBuildings = async () => {
    try {
      const allSettlements = await fetchSettlements();
      const settlement = allSettlements.find(s => s.id === Number(settlementId));
      if (settlement && settlement.buildings) {
        setBuildings(settlement.buildings);
      } else {
        setBuildings([]);
      }
    } catch (err) {
      console.error("Error fetching buildings:", err);
    }
  };

  useEffect(() => {
    loadVillagers();
    loadBuildings();
  }, [settlementId]);

  const handleAssignment = async () => {
    if (!selectedVillager || !selectedBuilding) {
      setAssignmentError("Please select both a villager and a building.");
      return;
    }
    setLoading(true);
    setAssignmentError("");
    setAssignmentMessage("");
    try {
      const payload = {
        settlement_id: settlementId,
        building_id: selectedBuilding,
        settler_id: selectedVillager,
      };
      const response = await assignVillager(payload);
      setAssignmentMessage(`Villager assigned successfully! ID: ${response.settler_id}`);
      if (onAssignmentSuccess) onAssignmentSuccess();
      loadVillagers();
    } catch (err) {
      setAssignmentError(err.response?.data?.error || "Error assigning villager.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p="4">
      <FormControl mb="2">
        <FormLabel>Select Idle Villager</FormLabel>
        <Select placeholder="Select villager" onChange={(e) => setSelectedVillager(e.target.value)} value={selectedVillager}>
          {idleVillagers.map((villager) => (
            <option key={villager.id} value={villager.id}>
              {villager.name}
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl mb="2">
        <FormLabel>Select Building</FormLabel>
        <Select placeholder="Select building" onChange={(e) => setSelectedBuilding(e.target.value)} value={selectedBuilding}>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.building_type} (ID: {building.id})
            </option>
          ))}
        </Select>
      </FormControl>
      {assignmentError && (
        <Alert status="error" mt="2">
          <AlertIcon />
          {assignmentError}
        </Alert>
      )}
      {assignmentMessage && (
        <Alert status="success" mt="2">
          <AlertIcon />
          {assignmentMessage}
        </Alert>
      )}
      <Button mt="2" colorScheme="teal" onClick={handleAssignment} isLoading={loading}>
        Assign Villager
      </Button>
    </Box>
  );
};

export default VillagerAssignment;
