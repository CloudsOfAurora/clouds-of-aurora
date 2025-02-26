// src/api.js
import axios from "axios";

// Use relative URLs; the proxy in package.json routes to your backend.
const API_BASE_URL = "/api";

// Helper: Get the stored access token from localStorage
const getAccessToken = () => localStorage.getItem("accessToken");

// Create an axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to automatically add the Authorization header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers["Authorization"] = "Bearer " + token;
    } else {
      console.log("No access token found in localStorage.");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API functions

export const deleteSettlement = async (id) => {
  const response = await axiosInstance.delete(`/settlement/${id}/delete/`);
  return response.data;
};

export const fetchGameState = async () => {
  const response = await axiosInstance.get("/game-state/");
  return response.data;
};

export const fetchSettlements = async () => {
  const response = await axiosInstance.get("/settlements/");
  return response.data;
};

export const fetchSettlement = async (id) => {
  const response = await axiosInstance.get(`/settlements/${id}/`);
  return response.data;
};

export const fetchBuildings = async () => {
  const response = await axiosInstance.get("/buildings/");
  return response.data;
};

export const fetchSettlers = async () => {
  const response = await axiosInstance.get("/settlers/");
  return response.data;
};

export const fetchLoreEntries = async () => {
  const response = await axiosInstance.get("/lore/");
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await axiosInstance.get("/current_user/");
  return response.data;
};

export const login = async (username, password) => {
  const response = await axios.post(`${API_BASE_URL}/token/`, { username, password });
  localStorage.setItem("accessToken", response.data.access);
  localStorage.setItem("refreshToken", response.data.refresh);
  return response.data;
};

export const register = async (username, password, email) => {
  const response = await axios.post(`${API_BASE_URL}/register/`, { username, password, email });
  return response.data;
};

export const createSettlement = async (name) => {
  const response = await axiosInstance.post("/settlement/create/", { name });
  return response.data;
};

export const placeBuilding = async (payload) => {
  const response = await axiosInstance.post("/building/place/", payload);
  return response.data;
};

export const assignVillager = async (payload) => {
  const response = await axiosInstance.post("/villager/assign/", payload);
  return response.data;
};

export const gatherResource = async (payload) => {
  const response = await axiosInstance.post("/gather_resource/", payload);
  return response.data;
};

export const fetchSettlementEvents = async (settlementId) => {
  const response = await axiosInstance.get(`/settlement/${settlementId}/events/`);
  return response.data;
};

export const fetchMapTiles = async (settlementId) => {
  const response = await axiosInstance.get(`/settlement/${settlementId}/map/`);
  return response.data;
};

export const toggleAssignment = async (payload) => {
  const response = await axiosInstance.post("/toggle_assignment/", payload);
  return response.data;
};


export default axiosInstance;
