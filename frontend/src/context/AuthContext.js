import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchCurrentUser } from "../api";

// Create Context
export const AuthContext = createContext();

// Custom hook to use AuthContext
export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUser = async () => {
            try {
                const userData = await fetchCurrentUser();
                if (!userData.error) {
                    setUser(userData);
                }
            } catch (err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        getUser();
    }, []);

    const loginUser = (userData) => {
        setUser(userData);
    };

    const logoutUser = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loginUser, logoutUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
