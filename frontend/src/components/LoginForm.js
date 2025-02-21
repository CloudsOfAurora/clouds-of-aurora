import React, { useState } from "react";
import { Box, Button, Input, FormControl, FormLabel, Alert, AlertIcon } from "@chakra-ui/react";
import { login } from "../api";
import { useAuth } from "../context/AuthContext";  // <-- Use AuthContext

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { login: authLogin } = useAuth();  // <-- Get login function

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userData = await login(username, password);
      authLogin(userData);  // <-- Auto-login after successful authentication
    } catch (err) {
      setError(err.response?.data?.error || "Login failed.");
    }
  };

  return (
    <Box p="4" maxW="400px" mx="auto">
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
