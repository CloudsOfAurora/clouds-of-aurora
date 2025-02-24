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
  onTileClick, // legacy
  onBuildingClick, // legacy
  onTileInfoClick, // legacy
  onResourceNodeClick, // legacy
  onResourceNodeDoubleClick, // legacy
  onRightClick, // legacy
  onTileHover, // legacy
  onTileInteraction, // new unified callback
}) => {
  const canvasRef = useRef(null);
  const clickTimer = useRef(null);

  // Helper: Calculate tile info from the event.
  const getTileInfo = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const tileWidth = width / gridSize;
    const tileHeight = height / gridSize;
    const tile_x = Math.floor((e.clientX - rect.left) / tileWidth);
    const tile_y = Math.floor((e.clientY - rect.top) / tileHeight);
    const pos = { x: e.clientX, y: e.clientY };
    const tile = mapTiles.find(
      (t) => t.coordinate_x === tile_x && t.coordinate_y === tile_y
    );
    return { tile, tile_x, tile_y, pos };
  };

  // Draw canvas contents.
  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    const tileWidth = width / gridSize;
    const tileHeight = height / gridSize;

    // Draw terrain tiles.
    mapTiles.forEach((tile) => {
      const { coordinate_x, coordinate_y, color } = tile;
      const x = coordinate_x * tileWidth;
      const y = coordinate_y * tileHeight;
      ctx.fillStyle = color || "#808080";
      ctx.fillRect(x, y, tileWidth, tileHeight);
      ctx.strokeStyle = "#000";
      ctx.strokeRect(x, y, tileWidth, tileHeight);

      // Draw resource node marker if available.
      if (tile.resource_nodes && tile.resource_nodes.length > 0) {
        ctx.fillStyle = "yellow"; // placeholder marker color.
        const centerX = x + tileWidth - 8;
        const centerY = y + 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw buildings.
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

  // Handle single click with debounce.
  const handleSingleClick = (e) => {
    clickTimer.current = setTimeout(() => {
      handleEvent(e, "single");
    }, 200);
  };

  // Handle double click: cancel the single-click timer.
  const handleDoubleClick = (e) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    handleEvent(e, "double");
  };

  // Unified event handler.
  const handleEvent = (e, eventType) => {
    e.stopPropagation();
    const info = getTileInfo(e);
    if (onTileInteraction) {
      onTileInteraction({ ...info, type: eventType });
      return;
    }
    // Fallback to legacy callbacks if no unified handler is provided.
    if (eventType === "single") {
      if (
        info.tile &&
        info.tile.resource_nodes &&
        info.tile.resource_nodes.length > 0 &&
        onResourceNodeClick
      ) {
        onResourceNodeClick(info.tile, info.pos);
        return;
      }
      if (onTileClick) {
        onTileClick({ tile_x: info.tile_x, tile_y: info.tile_y });
      } else if (onBuildingClick) {
        const building = buildings.find(
          (b) =>
            b.coordinate_x === info.tile_x && b.coordinate_y === info.tile_y
        );
        if (building) {
          onBuildingClick(building, info.pos);
          return;
        }
        if (onTileInfoClick) {
          onTileInfoClick(info.tile, info.pos);
        }
      } else if (onTileInfoClick) {
        onTileInfoClick(info.tile, info.pos);
      }
    } else if (eventType === "double") {
      if (
        info.tile &&
        info.tile.resource_nodes &&
        info.tile.resource_nodes.length > 0 &&
        onResourceNodeDoubleClick
      ) {
        onResourceNodeDoubleClick(info.tile);
      }
    } else if (eventType === "right") {
      if (onRightClick && info.tile) {
        onRightClick(info.tile, info.pos);
      }
    }
  };

  const handleMouseMove = (e) => {
    const info = getTileInfo(e);
    if (onTileHover) {
      onTileHover({ tile_x: info.tile_x, tile_y: info.tile_y });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: "1px solid #000",
        cursor: (onTileClick ||
          onBuildingClick ||
          onTileInfoClick ||
          onResourceNodeClick ||
          onResourceNodeDoubleClick ||
          onRightClick ||
          onTileInteraction)
          ? "pointer"
          : "default",
      }}
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        handleEvent(e, "right");
      }}
      onMouseMove={handleMouseMove}
    />
  );
};

export default SettlementMap;
