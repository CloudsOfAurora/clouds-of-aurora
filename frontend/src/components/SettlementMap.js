// src/components/SettlementMap.js
import React, { useEffect, useRef, useState } from "react";
import { drawTile, drawBuilding, drawResourceNode } from "../graphics/renderEngine";
import { loadResourceNodesSprite } from "../graphics/assetManager";

const DEFAULT_GRID_SIZE = 10;
const DEFAULT_CANVAS_WIDTH = 480;
const DEFAULT_CANVAS_HEIGHT = 480;

const SettlementMap = ({
  mapTiles,
  buildings = [],
  gridSize = DEFAULT_GRID_SIZE,
  width = DEFAULT_CANVAS_WIDTH,
  height = DEFAULT_CANVAS_HEIGHT,
  onTileClick,             // legacy callbacks
  onBuildingClick,
  onTileInfoClick,
  onResourceNodeClick,
  onResourceNodeDoubleClick,
  onRightClick,
  onTileHover,
  onTileInteraction,       // new unified callback
}) => {
  const canvasRef = useRef(null);
  const clickTimer = useRef(null);
  const [isDoubleClick, setIsDoubleClick] = useState(false);
  const [resourceNodesImg, setResourceNodesImg] = useState(null);

  // Compute tile dimensions from canvas size and grid size.
  const tileWidth = width / gridSize;
  const tileHeight = height / gridSize;

  // Load the resource nodes sprite image and log when loaded.
  useEffect(() => {
    loadResourceNodesSprite()
      .then((img) => {
        console.log("Resource nodes sprite loaded", img);
        setResourceNodesImg(img);
      })
      .catch((err) => {
        console.error("Failed to load resource nodes sprite:", err);
      });
  }, []);

  // Helper: Determine which tile was clicked.
  const getTileInfo = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const tile_x = Math.floor((e.clientX - rect.left) / tileWidth);
    const tile_y = Math.floor((e.clientY - rect.top) / tileHeight);
    const pos = { x: e.clientX, y: e.clientY };
    const tile = mapTiles.find(
      (t) => t.coordinate_x === tile_x && t.coordinate_y === tile_y
    );
    return { tile, tile_x, tile_y, pos };
  };

  // Drawing: Render tiles, resource nodes, and buildings.
  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    // Draw each terrain tile.
    mapTiles.forEach((tile) => {
      const dx = tile.coordinate_x * tileWidth;
      const dy = tile.coordinate_y * tileHeight;
      drawTile(ctx, tile, dx, dy, tileWidth, tileHeight);

      // Render resource node overlays (if any).
      if (tile.resource_nodes && tile.resource_nodes.length > 0) {
        tile.resource_nodes.forEach((node) => {
          console.log("Drawing node:", node.id, "sprite_key:", node.sprite_key);
          drawResourceNode(ctx, node, dx, dy, tileWidth, tileHeight, resourceNodesImg);
        });
      }
    });

    // Draw each building.
    buildings.forEach((building) => {
      if (building.coordinate_x !== null && building.coordinate_y !== null) {
        const dx = building.coordinate_x * tileWidth;
        const dy = building.coordinate_y * tileHeight;
        drawBuilding(ctx, building, dx, dy, tileWidth, tileHeight);
      }
    });
  }, [mapTiles, buildings, gridSize, width, height, tileWidth, tileHeight, resourceNodesImg]);

  // Event handling: Single click with debounce.
  const handleSingleClick = (e) => {
    clickTimer.current = setTimeout(() => {
      if (!isDoubleClick) {
        handleEvent(e, "single");
      }
      setIsDoubleClick(false);
    }, 150);
  };

  // Double click cancels the single-click timer.
  const handleDoubleClick = (e) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setIsDoubleClick(true);
    handleEvent(e, "double");
  };

  // Unified event handler for single, double, and right clicks.
  const handleEvent = (e, eventType) => {
    e.stopPropagation();
    const info = getTileInfo(e);
    if (onTileInteraction) {
      onTileInteraction({ ...info, type: eventType });
      return;
    }
    // Legacy handling.
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
        cursor:
          onTileClick ||
          onBuildingClick ||
          onTileInfoClick ||
          onResourceNodeClick ||
          onResourceNodeDoubleClick ||
          onRightClick ||
          onTileInteraction
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
