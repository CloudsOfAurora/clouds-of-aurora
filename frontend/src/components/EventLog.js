// src/components/EventLog.js
import React, { useEffect, useState } from "react";
import { Box, Text, Spinner, Alert, AlertIcon, VStack } from "@chakra-ui/react";
import { fetchSettlementEvents } from "../api";

const EventLog = ({ settlementId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchSettlementEvents(settlementId);
      setEvents(data);
      setError("");
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Error fetching event data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 10000);
    return () => clearInterval(interval);
  }, [settlementId]);

  if (loading) {
    return <Spinner />;
  }
  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error}
      </Alert>
    );
  }
  return (
    <Box>
      <Text fontWeight="bold" mb="2">Recent Events</Text>
      <VStack align="start" spacing={2}>
        {events.map((event) => (
          <Box key={event.id} p="2" borderWidth="1px" borderRadius="md" w="100%">
            <Text fontSize="sm">
              {new Date(event.timestamp).toLocaleString()} - {event.event_type.replace("_", " ")}
            </Text>
            <Text>{event.description}</Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

export default EventLog;
