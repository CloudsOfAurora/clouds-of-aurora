// src/components/Header.js
import React, { useEffect, useState } from 'react';
import { Flex, Button, Text } from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCurrentUser } from '../api';

const Header = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const getUser = async () => {
    try {
      const user = await fetchCurrentUser();
      if (!user.error) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setCurrentUser(null);
    navigate("/login");
  };

  return (
    <Flex bg="gray.800" p="4">
      <Button as={Link} to="/" colorScheme="teal" mr="2">
        Home
      </Button>
      {currentUser ? (
        <>
          <Text color="white" mr="2">
            Hello, {currentUser.username}!
          </Text>
          <Button as={Link} to="/dashboard" colorScheme="teal" mr="2">
            Dashboard
          </Button>
          <Button as={Link} to="/settlement" colorScheme="teal" mr="2">
            Create Settlement
          </Button>
          <Button onClick={handleLogout} colorScheme="red" mr="2">
            Log Out
          </Button>
        </>
      ) : (
        <>
          <Button as={Link} to="/register" colorScheme="teal" mr="2">
            Register
          </Button>
          <Button as={Link} to="/login" colorScheme="teal" mr="2">
            Login
          </Button>
        </>
      )}
    </Flex>
  );
};

export default Header;
