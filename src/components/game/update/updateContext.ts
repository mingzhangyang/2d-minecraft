import type { GameState, Rect } from '../runtime';
import { AnimalType } from '../types';
import type { FurnaceData } from '../types';

export type UpdateRect = Rect;
export type CollisionChecker = (rect: UpdateRect, animalType?: AnimalType) => boolean;
export type Intersector = (r1: UpdateRect, r2: UpdateRect) => boolean;
export type FurnaceUISetter = (value: FurnaceData | null) => void;

export type UpdateGameContext = {
  canvas: HTMLCanvasElement;
  state: GameState;
  setFurnaceUI: FurnaceUISetter;
  checkCollision: CollisionChecker;
  isIntersecting: Intersector;
  handleInteract: (button: number) => void;
};
