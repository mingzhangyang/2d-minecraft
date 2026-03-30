import { drawAnimals } from './drawAnimals';
import { drawPlayer } from './drawPlayer';
import { drawBlock } from './rendering';
import type { GameState } from '../runtime';

type DrawEntitiesParams = {
  ctx: CanvasRenderingContext2D;
  state: GameState;
};

export const drawEntities = ({ ctx, state }: DrawEntitiesParams) => {
  for (const item of state.droppedItems) {
    drawBlock(ctx, item.x, item.y, item.type, 16);
  }

  drawAnimals({ ctx, state });
  drawPlayer({ ctx, state });
};
