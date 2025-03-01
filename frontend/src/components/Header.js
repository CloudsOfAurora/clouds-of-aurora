// src/components/Header.js
import React from 'react';
import { Flex, Button, Text } from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logoutUser();
        navigate("/login");
    };

    return (
        <Flex bg="gray.800" p="4">
            <Button as={Link} to="/" colorScheme="teal" mr="2">
                Home
            </Button>
            {user ? (
                <>
                    <Text color="white" mr="2">
                        Hello, {user.username}!
                    </Text>
                    <Button as={Link} to="/dashboard" colorScheme="teal" mr="2">
                        Dashboard
                    </Button>
                    {/* Removed Create Settlement button from header */}
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
