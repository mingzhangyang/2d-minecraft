/**
 * World persistence via localStorage.
 * Strategy: save player state + inventory + tracked world edits on top of the
 * deterministic procedural baseline. This keeps save size small without
 * generating a second baseline world during every save.
 */
import type { GameState } from './runtime';
import { disposeWorldStreaming, generateWorld, getDirtyWorldEdits } from './world';
import { WORLD_HEIGHT, WORLD_WIDTH } from './constants';

const SAVE_KEY = 'blockbuilder_save_v2';
const LEGACY_SAVE_KEYS = ['blockbuilder_save_v1'];

type SaveData = {
  version: 2;
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
  // Only store tracked edits on top of deterministic generation
  worldDeltas: Array<[number, number, number]>; // [x, y, blockType]
};

export const saveGame = (state: GameState): void => {
  try {
    const deltas = getDirtyWorldEdits(state.world);

    const data: SaveData = {
      version: 2,
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
        isFlying: state.player.isFlying,
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
    if (data.version !== 2) return false;

    // Restore world from the deterministic baseline and replay tracked edits.
    disposeWorldStreaming(state.world);
    state.world = generateWorld();
    for (const [x, y, block] of data.worldDeltas) {
      if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
        state.world[x][y] = block;
      }
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
    state.player.breath = state.player.maxBreath;
    state.player.attackTimer = 0;
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
  for (const key of LEGACY_SAVE_KEYS) {
    localStorage.removeItem(key);
  }
};

export const hasSave = (): boolean => {
  return localStorage.getItem(SAVE_KEY) !== null;
};
