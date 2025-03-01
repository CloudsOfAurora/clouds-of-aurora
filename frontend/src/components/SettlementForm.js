// src/components/SettlementForm.js
import React, { useState } from "react";
import { Box, Button, Input, FormControl, FormLabel, Alert, AlertIcon } from "@chakra-ui/react";
import { createSettlement } from "../api";  // Use the token‑enabled API function
import { useNavigate } from "react-router-dom";

const SettlementForm = () => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleCreateSettlement = async (e) => {
    e.preventDefault();
    try {
      // Call our API function that uses the axios instance with the interceptor
      const data = await createSettlement(name);
      setMessage(data.message + " (ID: " + data.settlement_id + ")");
      setError(null);
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create settlement.");
      setMessage(null);
    }
  };

  return (
    <Box p="4" maxW="400px" mx="auto">
      {error && (
        <Alert status="error" mb="4">
          <AlertIcon />
          {error}
        </Alert>
      )}
      {message && (
        <Alert status="success" mb="4">
          <AlertIcon />
          {message}
        </Alert>
      )}
      <form onSubmit={handleCreateSettlement}>
        <FormControl id="settlement-name" mb="4">
          <FormLabel>Settlement Name</FormLabel>
          <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </FormControl>
        <Button type="submit" colorScheme="teal">Create Settlement</Button>
      </form>
    </Box>
  );
};

export default SettlementForm;
