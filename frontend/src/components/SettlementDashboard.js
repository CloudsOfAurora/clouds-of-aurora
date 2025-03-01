// src/components/SettlementDashboard.js
import React, { useEffect, useState } from "react";
import { Box, Text, Heading, Spinner, Alert, AlertIcon, Button } from "@chakra-ui/react";
import { fetchCurrentUser, fetchSettlements, deleteSettlement } from "../api";
import { Link, useNavigate } from "react-router-dom";
import SettlementForm from "./SettlementForm";

const SettlementDashboard = () => {
  const [user, setUser] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await fetchCurrentUser();
      if (!userData || userData.error) {
        navigate("/welcome");
        return;
      }
      setUser(userData);
      const allSettlements = await fetchSettlements();
      const mySettlements = allSettlements.filter(
        (s) => s.owner_id === userData.id
      );
      setSettlements(mySettlements);
      setError(null);
    } catch (err) {
      console.error(err);
      navigate("/welcome");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSettlement(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting settlement.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Box p="4">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Box p="4">
      <Heading as="h2" size="lg" mb="4">
        Welcome, {user.username}!
      </Heading>
      {settlements.length === 0 ? (
        <>
          <Text>You don't have any settlements yet.</Text>
          <SettlementForm onCreation={loadData} />
        </>
      ) : (
        settlements.map((settlement) => (
          <Box
            key={settlement.id}
            p="2"
            border="1px solid"
            borderColor="gray.300"
            borderRadius="md"
            mb="2"
          >
            <Text fontWeight="bold">{settlement.name}</Text>
            <Text>
              Food: {settlement.food} | Wood: {settlement.wood} | Stone: {settlement.stone}
            </Text>
            <Text fontSize="sm" color="gray.500">
              Created at: {new Date(settlement.created_at).toLocaleString()}
            </Text>
            <Link to={`/settlement/view/${settlement.id}`}>
              <Button mt="2" colorScheme="teal" mr="2">
                Enter Settlement
              </Button>
            </Link>
            <Button
              mt="2"
              colorScheme="red"
              onClick={() => handleDelete(settlement.id)}
            >
              Delete Settlement
            </Button>
          </Box>
        ))
      )}
    </Box>
  );
};

export default SettlementDashboard;
