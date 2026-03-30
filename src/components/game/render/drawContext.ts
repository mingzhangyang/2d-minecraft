import type { GameState } from '../runtime';

export type DrawGameContext = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: GameState;
};

export type TimedDrawGameContext = DrawGameContext & {
  timeProgress: number;
  sunHeight: number;
};

export type LitDrawGameContext = DrawGameContext & {
  sunHeight: number;
};
