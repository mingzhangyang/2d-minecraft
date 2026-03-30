import { STARS, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { drawBlockCached } from './rendering';
import { BlockType } from '../types';
import type { TimedDrawGameContext } from './drawContext';

export const drawTerrain = ({ canvas, ctx, state, timeProgress, sunHeight }: TimedDrawGameContext) => {
  ctx.fillStyle = '#0B0B2A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const dayOpacity = Math.max(0, Math.min(1, sunHeight + 0.5));
  ctx.fillStyle = `rgba(135, 206, 235, ${dayOpacity})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sunsetOpacity = Math.max(0, 1 - Math.abs(sunHeight) * 2.5) * 0.6;
  ctx.fillStyle = `rgba(255, 120, 50, ${sunsetOpacity})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const starOpacity = Math.max(0, Math.min(1, -sunHeight * 2));
  if (starOpacity > 0) {
    STARS.forEach(star => {
      const twinkle = Math.sin(state.tick * star.twinkleSpeed) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${starOpacity * (0.5 + twinkle * 0.5)})`;
      ctx.beginPath();
      ctx.arc(star.x * canvas.width, star.y * canvas.height, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height);
  ctx.rotate(timeProgress * Math.PI * 2 + Math.PI);

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(0, -canvas.height * 0.8, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F0F8FF';
  ctx.beginPath();
  ctx.arc(0, canvas.height * 0.8, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);

  const startX = Math.max(0, Math.floor(state.camera.x / TILE_SIZE));
  const endX = Math.min(WORLD_WIDTH, Math.ceil((state.camera.x + state.camera.width) / TILE_SIZE));
  const startY = Math.max(0, Math.floor(state.camera.y / TILE_SIZE));
  const endY = Math.min(WORLD_HEIGHT, Math.ceil((state.camera.y + state.camera.height) / TILE_SIZE));

  for (let x = startX; x < endX; x++) {
    for (let y = startY; y < endY; y++) {
      const block = state.world[x][y];
      if (block !== BlockType.AIR) {
        drawBlockCached(ctx, x * TILE_SIZE, y * TILE_SIZE, block);
      }
    }
  }

  ctx.restore();
};
