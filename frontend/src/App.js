import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import Header from "./components/Header";
import RegisterForm from "./components/RegisterForm";
import LoginForm from "./components/LoginForm";
import SettlementForm from "./components/SettlementForm";
import UserDashboard from "./components/SettlementDashboard";
import SettlementView from "./components/SettlementView";
import WelcomePage from "./components/WelcomePage";
import { AuthProvider } from "./context/AuthContext"; 

function App() {
  return (
    <AuthProvider> 
      <Router>
        <Header />
        <Box p="4">
          <Routes>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/" element={<WelcomePage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/settlement" element={<SettlementForm />} />
            <Route path="/settlement/view/:id" element={<SettlementView />} />
          </Routes>
        </Box>
      </Router>
    </AuthProvider>
  );
}

export default App;
