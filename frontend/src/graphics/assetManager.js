// src/graphics/assetManager.js
export const loadSpriteSheet = () => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = "/assets/spritesheet.png";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  };
  
  export const loadResourceNodesSprite = () => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = "/assets/resourceNodes.png";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  };
  