// src/components/WelcomePage.js
import React from "react";
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";

const WelcomePage = () => {
  return (
    <Box p="6" textAlign="center">
      <Heading as="h1" size="xl" mb="4">Welcome to Clouds of Aurora</Heading>
      <Text fontSize="lg" mb="6">A minimalistic 2D MMO settlement-building game.</Text>
      <Button as={Link} to="/register" colorScheme="teal" mr="2">Register</Button>
      <Button as={Link} to="/login" colorScheme="teal">Login</Button>
    </Box>
  );
};

export default WelcomePage;
