//src/components/LoginForm.js

import React, { useState } from "react";
import { Box, Button, Input, FormControl, FormLabel, Alert, AlertIcon } from "@chakra-ui/react";
import { login } from "../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Now correctly using useAuth

const LoginForm = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { loginUser } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const userData = await login(username, password);
            loginUser(userData); // Set user context
            setMessage("Logged in successfully.");
            setError(null);
            setTimeout(() => navigate("/"), 1000);
        } catch (err) {
            setError(err.response?.data?.error || "Login failed.");
            setMessage(null);
        }
    };

    return (
        <Box p="4" maxW="400px" mx="auto">
            {message && <Alert status="success" mb="4"><AlertIcon />{message}</Alert>}
            {error && <Alert status="error" mb="4"><AlertIcon />{error}</Alert>}
            <form onSubmit={handleLogin}>
                <FormControl id="username" mb="4">
                    <FormLabel>Username</FormLabel>
                    <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </FormControl>
                <FormControl id="password" mb="4">
                    <FormLabel>Password</FormLabel>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </FormControl>
                <Button type="submit" colorScheme="teal">Login</Button>
            </form>
        </Box>
    );
};

export default LoginForm;
