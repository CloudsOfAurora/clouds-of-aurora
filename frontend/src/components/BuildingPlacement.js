// src/components/BuildingPlacement.js
import React, { useState, useRef, useEffect } from "react";
import { Box, Button, FormControl, FormLabel, Select, Alert, AlertIcon } from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { placeBuilding } from "../api";

const GRID_SIZE = 10; // 10x10 grid
const CANVAS_WIDTH = 480; // pixels
const CANVAS_HEIGHT = 480; // pixels
const TILE_WIDTH = CANVAS_WIDTH / GRID_SIZE;
const TILE_HEIGHT = CANVAS_HEIGHT / GRID_SIZE;

const BuildingPlacement = ({ onPlacementSuccess }) => {
  const { id } = useParams(); // settlement ID
  const [buildingType, setBuildingType] = useState("");
  const [selectedTile, setSelectedTile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canvasRef = useRef(null);

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    // Convert click coordinates to grid indices
    const tile_x = Math.floor(clickX / TILE_WIDTH);
    const tile_y = Math.floor(clickY / TILE_HEIGHT);
    setSelectedTile({ tile_x, tile_y });
  };

  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = "#ccc";
    // Draw vertical lines
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE_WIDTH, 0);
      ctx.lineTo(i * TILE_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();
    }
    // Draw horizontal lines
    for (let j = 0; j <= GRID_SIZE; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * TILE_HEIGHT);
      ctx.lineTo(CANVAS_WIDTH, j * TILE_HEIGHT);
      ctx.stroke();
    }
    // If a tile is selected, highlight it
    if (selectedTile) {
      ctx.fillStyle = "rgba(0, 128, 0, 0.3)";
      ctx.fillRect(selectedTile.tile_x * TILE_WIDTH, selectedTile.tile_y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
    }
  };

  useEffect(() => {
    drawGrid();
  }, [selectedTile]);

  const handlePlacement = async () => {
    if (!buildingType) {
      setError("Please select a building type.");
      return;
    }
    if (!selectedTile) {
      setError("Please click on the map to select a tile.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        settlement_id: id,
        building_type: buildingType,
        tile_x: selectedTile.tile_x,
        tile_y: selectedTile.tile_y,
      };
      const response = await placeBuilding(payload);
      setMessage(`Building placed successfully! ID: ${response.building_id}`);
      if (onPlacementSuccess) {
        onPlacementSuccess();
      }
      setSelectedTile(null); // Reset selection after successful placement
    } catch (err) {
      setError(err.response?.data?.error || "Error placing building.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p="4" bg="white" borderRadius="md" mt="4">
      <FormControl>
        <FormLabel>Select Building Type</FormLabel>
        <Select 
          placeholder="Select building type" 
          onChange={(e) => setBuildingType(e.target.value)} 
          value={buildingType}
        >
          <option value="house">House</option>
          <option value="farmhouse">Farmhouse</option>
          <option value="lumber_mill">Lumber Mill</option>
          <option value="quarry">Quarry</option>
        </Select>
      </FormControl>
      <Box mt="4">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ border: "1px solid #000" }}
          onClick={handleCanvasClick}
        />
      </Box>
      {selectedTile && (
        <Box mt="2">
          <strong>Selected Tile:</strong> ({selectedTile.tile_x}, {selectedTile.tile_y})
        </Box>
      )}
      {error && (
        <Alert status="error" mt="2">
          <AlertIcon />
          {error}
        </Alert>
      )}
      {message && (
        <Alert status="success" mt="2">
          <AlertIcon />
          {message}
        </Alert>
      )}
      <Button mt="4" colorScheme="teal" onClick={handlePlacement} isLoading={loading}>
        Place Building
      </Button>
    </Box>
  );
};

export default BuildingPlacement;
