import { drawBlock } from './rendering';
import type { GameState } from '../runtime';
import { BlockType } from '../types';

type DrawPlayerParams = {
  ctx: CanvasRenderingContext2D;
  state: GameState;
};

export const drawPlayer = ({ ctx, state }: DrawPlayerParams) => {
// Draw player
ctx.save();
if (state.player.hurtTime > 0) {
  ctx.globalAlpha = 0.7;
  // Flash green if poisoned, otherwise red
  ctx.fillStyle = state.player.poisonTimer > 0 ? '#4CAF50' : 'red';
  ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);
  ctx.globalAlpha = 1;
} else if (state.player.poisonTimer > 0) {
  // Slight green tint when poisoned
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);
  ctx.globalAlpha = 1;
}

// Body
ctx.fillStyle = state.player.inventory[BlockType.COCOA_CHESTPLATE] > 0 ? '#654321' : '#1565C0'; // Blue shirt or Cocoa Chestplate
ctx.fillRect(state.player.x, state.player.y + 16, state.player.width, state.player.height - 32);
// Legs
ctx.fillStyle = state.player.inventory[BlockType.COCOA_LEGGINGS] > 0 ? '#4a3118' : '#424242'; // Dark pants or Cocoa Leggings
ctx.fillRect(state.player.x + 2, state.player.y + state.player.height - 16, 8, 16);
ctx.fillRect(state.player.x + state.player.width - 10, state.player.y + state.player.height - 16, 8, 16);
// Head
ctx.fillStyle = state.player.inventory[BlockType.COCOA_HELMET] > 0 ? '#654321' : '#FFCCBC'; // Skin tone or Cocoa Helmet
ctx.fillRect(state.player.x + 2, state.player.y, state.player.width - 4, 16);

// Boots
if (state.player.inventory[BlockType.COCOA_BOOTS] > 0) {
  ctx.fillStyle = '#3e2723';
  ctx.fillRect(state.player.x + 2, state.player.y + state.player.height - 4, 8, 4);
  ctx.fillRect(state.player.x + state.player.width - 10, state.player.y + state.player.height - 4, 8, 4);
}

// Cocoa Helmet Ears
if (state.player.inventory[BlockType.COCOA_HELMET] > 0) {
  ctx.fillStyle = '#654321';
  ctx.beginPath();
  ctx.arc(state.player.x + 6, state.player.y, 4, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(state.player.x + state.player.width - 6, state.player.y, 4, Math.PI, 0);
  ctx.fill();
}

// Player eyes
ctx.fillStyle = '#000';
const facingRight = state.mouse.x + state.camera.x > state.player.x + state.player.width / 2;
const eyeOffsetX = facingRight ? 12 : 4;
ctx.fillRect(state.player.x + eyeOffsetX, state.player.y + 4, 4, 4);
ctx.fillRect(state.player.x + eyeOffsetX + (facingRight ? 4 : 4), state.player.y + 4, 4, 4);

// Draw arms and held item
const armPlayerCenterX = state.player.x + state.player.width / 2;
const armPlayerCenterY = state.player.y + state.player.height / 2;
const mouseWorldX = state.mouse.x + state.camera.x;
const mouseWorldY = state.mouse.y + state.camera.y;

const isFacingRight = mouseWorldX > armPlayerCenterX;

ctx.save();
ctx.translate(armPlayerCenterX, armPlayerCenterY);

// Arm doesn't swing, just points left or right
if (!isFacingRight) {
  ctx.scale(-1, 1);
}

// Apply attack animation rotation
if (state.player.attackTimer && state.player.attackTimer > 0) {
  const attackProgress = (15 - state.player.attackTimer) / 15;
  // Swing down and back up
  const swingAngle = Math.sin(attackProgress * Math.PI) * (Math.PI / 2);
  ctx.rotate(swingAngle);
}

// Draw arm (T-shirt sleeve + skin)
ctx.fillStyle = '#1565C0'; // T-shirt sleeve
ctx.fillRect(-4, -4, 10, 8);
ctx.fillStyle = '#FFCCBC'; // Skin tone
ctx.fillRect(6, -4, 10, 8);

// Draw held item at the bottom of the arms
if (state.selectedBlock !== BlockType.AIR && state.selectedBlock !== BlockType.DIRT && (state.player.inventory[state.selectedBlock] || 0) > 0) {
  ctx.translate(12, 4); // Move to end of arm, slightly down
  ctx.rotate(Math.PI / 4); // Rotate so it looks like it's being held forward
  // Draw the item
  drawBlock(ctx, -8, -16, state.selectedBlock, 24); // Draw slightly larger and offset
}

ctx.restore();
ctx.restore();

};
