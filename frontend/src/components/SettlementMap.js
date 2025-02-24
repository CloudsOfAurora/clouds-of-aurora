// src/components/SettlementMap.js
import React, { useEffect, useRef } from "react";

const DEFAULT_GRID_SIZE = 10;
const DEFAULT_CANVAS_WIDTH = 300;
const DEFAULT_CANVAS_HEIGHT = 300;

const SettlementMap = ({
  mapTiles,
  buildings = [],
  gridSize = DEFAULT_GRID_SIZE,
  width = DEFAULT_CANVAS_WIDTH,
  height = DEFAULT_CANVAS_HEIGHT,
  onTileClick,         // For placement mode
  onBuildingClick,     // For building info pop-up
  onTileInfoClick,     // For tile info pop-up (empty tile)
  onResourceNodeClick, // For resource node popup (single click)
  onResourceNodeDoubleClick, // For double-click (to assign gathering)
  onTileHover,         // Callback for mouse move events
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    const tileWidth = width / gridSize;
    const tileHeight = height / gridSize;
    
    // Draw terrain tiles
    mapTiles.forEach((tile) => {
      const { coordinate_x, coordinate_y, color } = tile;
      const x = coordinate_x * tileWidth;
      const y = coordinate_y * tileHeight;
      ctx.fillStyle = color || "#808080";
      ctx.fillRect(x, y, tileWidth, tileHeight);
      ctx.strokeStyle = "#000";
      ctx.strokeRect(x, y, tileWidth, tileHeight);
  
      // Draw resource node marker if available
      if (tile.resource_nodes && tile.resource_nodes.length > 0) {
        ctx.fillStyle = "yellow"; // Placeholder marker color
        const centerX = x + tileWidth - 8;
        const centerY = y + 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    // Draw buildings on top
    buildings.forEach((building) => {
      if (building.coordinate_x !== null && building.coordinate_y !== null) {
        const x = building.coordinate_x * tileWidth;
        const y = building.coordinate_y * tileHeight;
        ctx.fillStyle = building.is_constructed ? "green" : "orange";
        ctx.fillRect(x, y, tileWidth, tileHeight);
        ctx.fillStyle = "white";
        ctx.font = "12px sans-serif";
        const typeInitial = building.building_type.charAt(0).toUpperCase();
        ctx.fillText(typeInitial, x + tileWidth / 2 - 4, y + tileHeight / 2 + 4);
      }
    });
  }, [mapTiles, buildings, gridSize, width, height]);

  // Single click handler remains unchanged.
  const handleClick = (e) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX;
    const clickY = e.clientY;
    const tileWidth = width / gridSize;
    const tileHeight = height / gridSize;
    const tile_x = Math.floor((e.clientX - rect.left) / tileWidth);
    const tile_y = Math.floor((e.clientY - rect.top) / tileHeight);
    
    const tile = mapTiles.find(
      (t) => t.coordinate_x === tile_x && t.coordinate_y === tile_y
    );
    
    // If tile has resource node, call onResourceNodeClick.
    if (tile && tile.resource_nodes && tile.resource_nodes.length > 0 && onResourceNodeClick) {
      onResourceNodeClick(tile, { x: clickX, y: clickY });
      return;
    }
    
    // Otherwise, fallback to other callbacks.
    if (onTileClick) {
      onTileClick({ tile_x, tile_y });
    } else if (onBuildingClick) {
      const building = buildings.find(
        (b) => b.coordinate_x === tile_x && b.coordinate_y === tile_y
      );
      if (building) {
        onBuildingClick(building, { x: clickX, y: clickY });
        return;
      }
      if (onTileInfoClick) {
        onTileInfoClick(tile, { x: clickX, y: clickY });
      }
    } else if (onTileInfoClick) {
      onTileInfoClick(tile, { x: clickX, y: clickY });
    }
  };

  // New double-click handler for resource nodes.
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const tileWidth = width / gridSize;
    const tileHeight = height / gridSize;
    const tile_x = Math.floor((e.clientX - rect.left) / tileWidth);
    const tile_y = Math.floor((e.clientY - rect.top) / tileHeight);
    const tile = mapTiles.find(
      (t) => t.coordinate_x === tile_x && t.coordinate_y === tile_y
    );
    if (tile && tile.resource_nodes && tile.resource_nodes.length > 0 && onResourceNodeDoubleClick) {
      onResourceNodeDoubleClick(tile);
    }
  };

  // New mouse move handler for hover detection.
  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const tileWidth = width / gridSize;
    const tileHeight = height / gridSize;
    const tile_x = Math.floor((e.clientX - rect.left) / tileWidth);
    const tile_y = Math.floor((e.clientY - rect.top) / tileHeight);
    if (onTileHover) {
      onTileHover({ tile_x, tile_y });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: "1px solid #000",
        cursor: (onTileClick || onBuildingClick || onTileInfoClick || onResourceNodeClick || onResourceNodeDoubleClick)
          ? "pointer"
          : "default",
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseMove={handleMouseMove}
    />
  );
};

export default SettlementMap;
