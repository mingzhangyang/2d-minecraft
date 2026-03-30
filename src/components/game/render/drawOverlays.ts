import { REACH, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { getRequiredProgress } from '../crafting';
import { BlockType, Weather } from '../types';
import type { GameState } from '../runtime';
import type { LitDrawGameContext } from './drawContext';

type DrawWorldOverlaysParams = {
  ctx: CanvasRenderingContext2D;
  state: GameState;
};

export const drawWorldOverlays = ({ ctx, state }: DrawWorldOverlaysParams) => {
// Draw mining progress
if (state.mining.progress > 0 && state.mining.x !== -1) {
  const type = state.world[state.mining.x][state.mining.y];
  const hasItem = (state.player.inventory[state.selectedBlock] || 0) > 0;
  const { requiredProgress } = getRequiredProgress(type, state.selectedBlock, hasItem, state.player.isFlying);
  const progressRatio = Math.min(1, state.mining.progress / requiredProgress);
  ctx.fillStyle = `rgba(0, 0, 0, ${progressRatio * 0.5})`;
  ctx.fillRect(state.mining.x * TILE_SIZE, state.mining.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.mining.x * TILE_SIZE + TILE_SIZE/2, state.mining.y * TILE_SIZE + TILE_SIZE/2);
  ctx.lineTo(state.mining.x * TILE_SIZE + TILE_SIZE * progressRatio, state.mining.y * TILE_SIZE + TILE_SIZE * progressRatio);
  ctx.stroke();
}

// Draw player health bar
if (state.player.health < state.player.maxHealth) {
  const healthRatio = Math.max(0, state.player.health / state.player.maxHealth);
  ctx.fillStyle = 'red';
  ctx.fillRect(state.player.x, state.player.y - 8, state.player.width, 4);
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(state.player.x, state.player.y - 8, state.player.width * healthRatio, 4);
}

// Draw highlight block
const worldX = state.mouse.x + state.camera.x;
const worldY = state.mouse.y + state.camera.y;
const gridX = Math.floor(worldX / TILE_SIZE);
const gridY = Math.floor(worldY / TILE_SIZE);

const playerCenterX = state.player.x + state.player.width / 2;
const playerCenterY = state.player.y + state.player.height / 2;
const dist = Math.sqrt(Math.pow(worldX - playerCenterX, 2) + Math.pow(worldY - playerCenterY, 2));

const currentReach = state.selectedBlock === BlockType.FANG_LANCE ? REACH * 1.5 : REACH;

if (dist <= currentReach && gridX >= 0 && gridX < WORLD_WIDTH && gridY >= 0 && gridY < WORLD_HEIGHT) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

};

export const drawScreenOverlays = ({ canvas, ctx, state, sunHeight }: LitDrawGameContext) => {
// Ambient Darkness (Multiply Blend Mode)
const darkness = Math.max(0, Math.min(1, -sunHeight * 1.2 + 0.2));
if (darkness > 0) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const r = Math.floor(255 - darkness * (255 - 100));
  const g = Math.floor(255 - darkness * (255 - 100));
  const b = Math.floor(255 - darkness * (255 - 150));
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// Draw weather
if (state.weather !== Weather.CLEAR) {
  ctx.save();
  const isSnow = state.weather === Weather.SNOW;
  const isStorm = state.weather === Weather.STORM;
  
  // Darken sky
  ctx.fillStyle = isStorm ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Particles
  ctx.fillStyle = isSnow ? 'white' : 'rgba(150, 200, 255, 0.6)';
  const particleCount = isStorm ? 200 : 100;
  for (let i = 0; i < particleCount; i++) {
    // Pseudo-random based on tick and i
    const px = ((i * 137 + state.tick * (isSnow ? 1 : 15)) % canvas.width);
    const py = ((i * 93 + state.tick * (isSnow ? 2 : 25)) % canvas.height);
    
    if (isSnow) {
      ctx.fillRect(px, py, 3, 3);
    } else {
      ctx.fillRect(px, py, 2, 12);
    }
  }
  
  // Lightning
  if (isStorm && Math.random() < 0.01) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();
}

};
