import { drawEntities } from './drawEntities';
import type { DrawGameContext } from './drawContext';
import { drawScreenOverlays, drawWorldOverlays } from './drawOverlays';
import { drawTerrain } from './drawTerrain';

export const drawGame = ({ canvas, ctx, state }: DrawGameContext) => {
  const timeProgress = state.timeOfDay / 7200;
  const sunHeight = Math.cos((timeProgress - 0.5) * Math.PI * 2);

  drawTerrain({ canvas, ctx, state, timeProgress, sunHeight });

  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);
  drawEntities({ ctx, state });
  drawWorldOverlays({ ctx, state });
  ctx.restore();

  drawScreenOverlays({ canvas, ctx, state, sunHeight });
};
