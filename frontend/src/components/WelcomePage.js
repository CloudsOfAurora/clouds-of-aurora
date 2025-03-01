import React from "react";
import { Box, Heading, Text, Button, VStack, Container, Divider } from "@chakra-ui/react";
import { Link } from "react-router-dom";

const WelcomePage = () => {
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Container
        maxW="xl"
        bg="whiteAlpha.900"
        p={8}
        borderRadius="2xl"
        boxShadow="1xl"
        textAlign="center"
      >
        <Heading as="h1" size="2xl" mb={4} color="blue.700">
          Welcome to Clouds of Aurora
        </Heading>
        <Text fontSize="lg" color="gray.700" fontStyle="italic">
          A world reborn after the Aurora Cataclysm, where magic lingers in the skies and survival is a delicate balance.
        </Text>
        <Divider my={6} />
        
        <VStack spacing={4} align="center">
          <Text fontSize="md" color="gray.700" textAlign="justify">
            Centuries ago, the world was torn apart by a divine calamity. What was once a single landmass now exists as floating islands adrift in the endless sky. 
            Ancient magic pulses through the remnants, shaping the land and its inhabitants. Kingdoms have risen from the ruins, forging a fragile peace amidst the lingering chaos.
          </Text>
          <Text fontSize="md" color="gray.700" textAlign="justify">
            You are among the new settlers, tasked with building a thriving community in these uncertain skies. Gather resources, withstand the elements, and uncover the lost secrets of the past.
            Will you harness the power of the ancient ley lines, forge alliances, or carve your own destiny in the clouds?
          </Text>
        </VStack>
        
        <Divider my={6} />
        
        <Heading as="h2" size="lg" mb={3} color="blue.600">
          How to Navigate the World
        </Heading>
        <VStack spacing={2} align="start" textAlign="left" fontSize="md" color="gray.700">
          <Text>• <strong>Left Click:</strong> Inspect a tile’s details.</Text>
          <Text>• <strong>Double Click:</strong> Assign a villager to work.</Text>
          <Text>• <strong>Right Click:</strong> Open an extended information panel.</Text>
        </VStack>
        
        <Box mt={6}>
          <Button as={Link} to="/register" colorScheme="blue" size="lg" mr={3}>
            Register
          </Button>
          <Button as={Link} to="/login" colorScheme="blue" size="lg" variant="outline">
            Login
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default WelcomePage;
