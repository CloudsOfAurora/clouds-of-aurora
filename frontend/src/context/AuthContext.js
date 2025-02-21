import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser } from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Check if user is logged in when the app loads
  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await fetchCurrentUser();
        if (!userData.error) {
          setUser(userData);
        }
      } catch (error) {
        setUser(null);
      }
    };
    checkUser();
  }, []);

  const login = (userData) => {
    setUser(userData);
    navigate("/");
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
