// src/graphics/renderEngine.js
import { SPRITE_MAP } from "./graphicsConfig";
import { loadSpriteSheet, loadResourceNodesSprite } from "./assetManager";

let spriteSheet = null;
loadSpriteSheet()
  .then((img) => {
    spriteSheet = img;
  })
  .catch((err) => {
    console.error("Failed to load sprite sheet:", err);
  });

let resourceNodesSprite = null;
loadResourceNodesSprite()
  .then((img) => {
    resourceNodesSprite = img;
  })
  .catch((err) => {
    console.error("Failed to load resource nodes sprite:", err);
  });

// dWidth/dHeight: destination width/height (tile dimensions)
export const drawTile = (ctx, tile, dx, dy, dWidth, dHeight) => {
  if (!spriteSheet) {
    ctx.fillStyle = tile.color || "#808080";
    ctx.fillRect(dx, dy, dWidth, dHeight);
    return;
  }
  const mapping = SPRITE_MAP.terrain[tile.terrain_type] || SPRITE_MAP.terrain.grass;
  ctx.drawImage(spriteSheet, mapping.sx, mapping.sy, 48, 48, dx, dy, dWidth, dHeight);
};

export const drawBuilding = (ctx, building, dx, dy, dWidth, dHeight) => {
  if (!spriteSheet) {
    ctx.fillStyle = building.building_type === "house" ? "brown" : "gray";
    ctx.fillRect(dx, dy, dWidth, dHeight);
    return;
  }
  const mapping = SPRITE_MAP.buildings[building.building_type];
    if (!building.is_constructed) {
        const mappingUnder = SPRITE_MAP.buildings[building.building_type + "_construction"];
        if (mappingUnder) {
            ctx.drawImage(spriteSheet, mappingUnder.sx, mappingUnder.sy, 48, 48, dx, dy, dWidth, dHeight);
        } else {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.drawImage(spriteSheet, mapping.sx, mapping.sy, 48, 48, dx, dy, dWidth, dHeight);
            ctx.restore();
        }
        return;
    }
  if (mapping) {
    ctx.drawImage(spriteSheet, mapping.sx, mapping.sy, 48, 48, dx, dy, dWidth, dHeight);
  }
};


export const drawResourceNode = (ctx, node, dx, dy, dWidth, dHeight, resourceNodesImg) => {
  if (!resourceNodesImg) {
    // Fallback drawing if image not loaded.
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(dx + dWidth / 2, dy + dHeight / 2, dWidth / 4, 0, 2 * Math.PI);
    ctx.fill();
    return;
  }
  const mapping = SPRITE_MAP.resource_nodes[node.sprite_key];
  if (!mapping) {
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(dx + dWidth / 2, dy + dHeight / 2, dWidth / 4, 0, 2 * Math.PI);
    ctx.fill();
    return;
  }
  // Use a source size of 48 (matching tiles and buildings)
  const SOURCE_SIZE = 48;
  ctx.drawImage(resourceNodesImg, mapping.sx, mapping.sy, SOURCE_SIZE, SOURCE_SIZE, dx, dy, dWidth, dHeight);
};
