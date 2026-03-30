/**
 * World persistence via localStorage.
 * Strategy: save player state + inventory + only the world blocks that differ
 * from fresh procedural generation (delta encoding). This keeps save size small.
 */
import type { GameState } from './runtime';
import { generateWorld } from './world';
import { BlockType } from './types';

const SAVE_KEY = 'blockbuilder_save_v1';

type SaveData = {
  version: 1;
  tick: number;
  timeOfDay: number;
  weather: string;
  cocoaCatDefeated: boolean;
  discoveredItems: Record<number, boolean>;
  furnaces: Record<string, unknown>;
  player: {
    x: number; y: number;
    health: number; maxHealth: number;
    hunger: number; maxHunger: number;
    exhaustion: number;
    poisonTimer: number; poisonTick: number;
    isFlying: boolean;
    inventory: Record<number, number>;
    durability: Record<number, number>;
  };
  // Only store blocks that differ from fresh generation
  worldDeltas: Array<[number, number, number]>; // [x, y, blockType]
};

/** Compute which world blocks differ from a freshly generated world */
const buildWorldDeltas = (current: BlockType[][], fresh: BlockType[][]): Array<[number, number, number]> => {
  const deltas: Array<[number, number, number]> = [];
  const w = current.length;
  for (let x = 0; x < w; x++) {
    const col = current[x];
    const freshCol = fresh[x];
    if (!col || !freshCol) continue;
    for (let y = 0; y < col.length; y++) {
      if (col[y] !== freshCol[y]) {
        deltas.push([x, y, col[y]]);
      }
    }
  }
  return deltas;
};

let cachedFreshWorld: BlockType[][] | null = null;
const getFreshWorld = (): BlockType[][] => {
  if (!cachedFreshWorld) cachedFreshWorld = generateWorld();
  return cachedFreshWorld;
};

export const saveGame = (state: GameState): void => {
  try {
    const fresh = getFreshWorld();
    const deltas = buildWorldDeltas(state.world, fresh);

    const data: SaveData = {
      version: 1,
      tick: state.tick,
      timeOfDay: state.timeOfDay,
      weather: state.weather,
      cocoaCatDefeated: state.cocoaCatDefeated,
      discoveredItems: state.discoveredItems,
      furnaces: state.furnaces as Record<string, unknown>,
      player: {
        x: state.player.x,
        y: state.player.y,
        health: state.player.health,
        maxHealth: state.player.maxHealth,
        hunger: state.player.hunger,
        maxHunger: state.player.maxHunger,
        exhaustion: state.player.exhaustion,
        poisonTimer: state.player.poisonTimer,
        poisonTick: state.player.poisonTick,
        isFlying: state.player.isFlying ?? false,
        inventory: state.player.inventory,
        durability: state.player.durability,
      },
      worldDeltas: deltas,
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
};

export const loadGame = (state: GameState): boolean => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const data: SaveData = JSON.parse(raw);
    if (data.version !== 1) return false;

    // Restore world: start from fresh and apply deltas
    const fresh = getFreshWorld();
    // Deep copy fresh world into state.world
    for (let x = 0; x < fresh.length; x++) {
      state.world[x] = [...fresh[x]];
    }
    for (const [x, y, block] of data.worldDeltas) {
      if (state.world[x]) state.world[x][y] = block as BlockType;
    }

    // Restore player
    state.player.x = data.player.x;
    state.player.y = data.player.y;
    state.player.health = data.player.health;
    state.player.maxHealth = data.player.maxHealth;
    state.player.hunger = data.player.hunger;
    state.player.maxHunger = data.player.maxHunger;
    state.player.exhaustion = data.player.exhaustion;
    state.player.poisonTimer = data.player.poisonTimer;
    state.player.poisonTick = data.player.poisonTick;
    state.player.isFlying = data.player.isFlying;
    state.player.inventory = data.player.inventory;
    state.player.durability = data.player.durability;
    state.player.vx = 0;
    state.player.vy = 0;

    // Restore world state
    state.tick = data.tick;
    state.timeOfDay = data.timeOfDay;
    state.weather = data.weather as typeof state.weather;
    state.cocoaCatDefeated = data.cocoaCatDefeated;
    state.discoveredItems = data.discoveredItems;
    state.furnaces = data.furnaces as typeof state.furnaces;
    state.invChanged = true;

    return true;
  } catch (e) {
    console.warn('Failed to load game:', e);
    return false;
  }
};

export const deleteSave = (): void => {
  localStorage.removeItem(SAVE_KEY);
  cachedFreshWorld = null; // clear delta baseline
};

export const hasSave = (): boolean => {
  return localStorage.getItem(SAVE_KEY) !== null;
};
