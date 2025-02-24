// src/components/SettlementCanvas.js
import React, { useEffect, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";

const GRID_SIZE = 10;
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 300;
const TILE_WIDTH = CANVAS_WIDTH / GRID_SIZE;
const TILE_HEIGHT = CANVAS_HEIGHT / GRID_SIZE;

const SettlementCanvas = ({ buildings, placementMode, selectedTile, onTileClick }) => {
  const canvasRef = useRef(null);
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid lines
    ctx.strokeStyle = "#ccc";
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE_WIDTH, 0);
      ctx.lineTo(i * TILE_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let j = 0; j <= GRID_SIZE; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * TILE_HEIGHT);
      ctx.lineTo(CANVAS_WIDTH, j * TILE_HEIGHT);
      ctx.stroke();
    }

    // Draw buildings on the grid
    buildings.forEach((building) => {
      if (building.coordinate_x !== null && building.coordinate_y !== null) {
        ctx.fillStyle = building.is_constructed ? "green" : "orange";
        const x = building.coordinate_x * TILE_WIDTH;
        const y = building.coordinate_y * TILE_HEIGHT;
        ctx.fillRect(x, y, TILE_WIDTH, TILE_HEIGHT);

        ctx.fillStyle = "white";
        ctx.font = "12px sans-serif";
        const typeInitial = building.building_type.charAt(0).toUpperCase();
        ctx.fillText(typeInitial, x + TILE_WIDTH / 2 - 4, y + TILE_HEIGHT / 2 + 4);
      }
    });

    // Highlight selected tile if in placement mode
    if (placementMode && selectedTile) {
      ctx.fillStyle = "rgba(0, 128, 0, 0.3)";
      ctx.fillRect(selectedTile.tile_x * TILE_WIDTH, selectedTile.tile_y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [buildings, selectedTile, placementMode]);

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const tile_x = Math.floor(clickX / TILE_WIDTH);
    const tile_y = Math.floor(clickY / TILE_HEIGHT);
  
    const clickedBuilding = buildings.find(
      (b) => b.coordinate_x === tile_x && b.coordinate_y === tile_y
    );
  
    if (clickedBuilding) {
      setHoveredBuilding(clickedBuilding);
      // Use canvas-relative coordinates for tooltip placement
      setTooltipPosition({ x: clickX, y: clickY });
    } else {
      setHoveredBuilding(null);
    }
  
    if (placementMode) {
      onTileClick({ tile_x, tile_y });
    }
  };

  return (
    <Box position="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ border: "1px solid #000", cursor: placementMode ? "pointer" : "default" }}
        onClick={handleClick}
      />
      {hoveredBuilding && (
        <Box
          position="absolute"
          top={`${tooltipPosition.y}px`}
          left={`${tooltipPosition.x}px`}
          transform="translate(-50%, -100%)"  // Adjusted transform for positioning
          pointerEvents="none"
          zIndex="10"
          bg="gray.800"
          color="white"
          p="2"
          borderRadius="md"
          boxShadow="md"
          fontSize="sm"
          maxW="200px"
          textAlign="center"
          whiteSpace="normal"        // Allow wrapping
          wordBreak="break-word"      // Prevent overflow issues
        >
          <strong>{hoveredBuilding.building_type.toUpperCase()}</strong>
          <br />
          {hoveredBuilding.description || "No additional info available."}
        </Box>
      )}
    </Box>
  );
};

export default SettlementCanvas;
