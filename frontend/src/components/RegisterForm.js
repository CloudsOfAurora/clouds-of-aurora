//src/components/RegisterForm.js

import React, { useState } from "react";
import { Box, Button, Input, FormControl, FormLabel, Alert, AlertIcon } from "@chakra-ui/react";
import { register, login } from "../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Use auth context

const RegisterForm = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { loginUser } = useAuth();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await register(username, password, email);
            setMessage("Registered successfully. Logging in...");
            const userData = await login(username, password);
            loginUser(userData);
            setTimeout(() => navigate("/"), 1000);
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed.");
            setMessage(null);
        }
    };

    return (
        <Box p="4" maxW="400px" mx="auto">
            {message && <Alert status="success" mb="4"><AlertIcon />{message}</Alert>}
            {error && <Alert status="error" mb="4"><AlertIcon />{error}</Alert>}
            <form onSubmit={handleRegister}>
                <FormControl id="username" mb="4">
                    <FormLabel>Username</FormLabel>
                    <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </FormControl>
                <FormControl id="email" mb="4">
                    <FormLabel>Email</FormLabel>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </FormControl>
                <FormControl id="password" mb="4">
                    <FormLabel>Password</FormLabel>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </FormControl>
                <Button type="submit" colorScheme="teal">Register</Button>
            </form>
        </Box>
    );
};

export default RegisterForm;
