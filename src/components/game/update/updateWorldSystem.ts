import { soundEngine } from '../../../utils/SoundEngine';
import { GRAVITY, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import type { GameState } from '../runtime';
import { clonePlayer, getFuelTicks, getSmeltResult, respawnPlayer } from '../runtime';
import { BlockType, Weather } from '../types';
import type { FurnaceData } from '../types';
import { evictWorldColumns, queueWorldPrefetch } from '../world';
import type { CollisionChecker, FurnaceUISetter } from './updateContext';

// Circular buffer state for history rewind
// Using a separate module-level object so it doesn't bloat GameState
const historyBuffer = {
  buf: null as (import('../runtime').GameHistoryEntry | undefined)[] | null,
  head: 0,
  size: 0,
  capacity: 300, // 5 seconds at 60fps – half the old limit, far less memory
};

const getHistoryBuf = () => {
  if (!historyBuffer.buf) {
    historyBuffer.buf = new Array(historyBuffer.capacity);
    historyBuffer.head = 0;
    historyBuffer.size = 0;
  }
  return historyBuffer.buf;
};

// Keep a generous margin beyond the viewport so nearby animal simulation and
// interaction checks do not immediately regenerate evicted columns.
const WORLD_STREAM_KEEP_BUFFER_TILES = 256;

const applyWorldStreamingWindow = (state: GameState) => {
  const visibleStartX = Math.max(0, Math.floor(state.camera.x / TILE_SIZE));
  const visibleEndX = Math.min(
    WORLD_WIDTH - 1,
    Math.ceil((state.camera.x + state.camera.width) / TILE_SIZE) - 1,
  );
  const keepStartX = visibleStartX - WORLD_STREAM_KEEP_BUFFER_TILES;
  const keepEndX = visibleEndX + WORLD_STREAM_KEEP_BUFFER_TILES;
  evictWorldColumns(state.world, keepStartX, keepEndX);
  queueWorldPrefetch(state.world, visibleStartX, visibleEndX, state.player.vx);
};

export const rewindOrSaveHistory = (state: GameState) => {
  const buf = getHistoryBuf();

  if (state.keys['KeyG']) {
    // Pop two frames (to step back visibly)
    for (let i = 0; i < 2 && historyBuffer.size > 0; i++) {
      historyBuffer.head = (historyBuffer.head - 1 + historyBuffer.capacity) % historyBuffer.capacity;
      historyBuffer.size--;
    }
    if (historyBuffer.size > 0) {
      const idx = (historyBuffer.head - 1 + historyBuffer.capacity) % historyBuffer.capacity;
      const pastState = buf[idx];
      if (pastState) {
        state.player = clonePlayer(pastState.player);
        state.animals = pastState.animals.map(animal => ({ ...animal }));
        state.droppedItems = pastState.droppedItems.map(item => ({ ...item }));
        state.tick = pastState.tick;
        state.timeOfDay = pastState.timeOfDay;
        state.camera = { ...pastState.camera };
      }
    }
    return true;
  }

  // Only snapshot every 3 frames to reduce memory pressure
  if (state.tick % 3 !== 0) return false;

  const writeIdx = historyBuffer.head % historyBuffer.capacity;
  buf[writeIdx] = {
    player: clonePlayer(state.player),
    animals: state.animals.map(animal => ({ ...animal })),
    droppedItems: state.droppedItems.map(item => ({ ...item })),
    tick: state.tick,
    timeOfDay: state.timeOfDay,
    camera: { ...state.camera },
  };
  historyBuffer.head = (historyBuffer.head + 1) % historyBuffer.capacity;
  if (historyBuffer.size < historyBuffer.capacity) historyBuffer.size++;

  return false;
};

export const syncDeathState = (state: GameState) => {
  const { player } = state;

  if (player.health <= 0 || state.isDead) {
    if (state.autoRespawn) {
      respawnPlayer(state);
    } else if (!state.isDead) {
      state.isDead = true;
      if (state.isInventoryOpen) {
        window.dispatchEvent(new CustomEvent('forceCloseInventory'));
      }
    }
  } else if (state.isDead) {
    state.isDead = false;
  }
};

export const clearForcedDirt = (state: GameState) => {
  if (state.player.inventory[BlockType.DIRT] > 0) {
    state.player.inventory[BlockType.DIRT] = 0;
    state.invChanged = true;
    if (state.selectedBlock === BlockType.DIRT) {
      window.dispatchEvent(new CustomEvent('clearDirt'));
    }
  }
};

export const updateDeadPlayer = ({
  canvas,
  state,
  checkCollision,
}: {
  canvas: HTMLCanvasElement;
  state: GameState;
  checkCollision: CollisionChecker;
}) => {
  const { player } = state;

  player.vy += GRAVITY;
  player.y += player.vy;
  if (checkCollision(player)) {
    if (player.vy > 0) {
      player.y = Math.floor((player.y + player.height) / TILE_SIZE) * TILE_SIZE - player.height - 0.01;
    }
    player.vy = 0;
  }
  state.camera.width = canvas.width;
  state.camera.height = canvas.height;
  state.camera.x = player.x + player.width / 2 - state.camera.width / 2;
  state.camera.y = player.y + player.height / 2 - state.camera.height / 2;
  state.camera.x = Math.max(0, Math.min(state.camera.x, WORLD_WIDTH * TILE_SIZE - state.camera.width));
  state.camera.y = Math.max(0, Math.min(state.camera.y, WORLD_HEIGHT * TILE_SIZE - state.camera.height));
  applyWorldStreamingWindow(state);
};

export const updateFurnaces = ({
  state,
  setFurnaceUI,
}: {
  state: GameState;
  setFurnaceUI: FurnaceUISetter;
}) => {
const loadedMinX = Math.max(
  0,
  Math.floor(state.camera.x / TILE_SIZE) - WORLD_STREAM_KEEP_BUFFER_TILES,
);
const loadedMaxX = Math.min(
  WORLD_WIDTH - 1,
  Math.ceil((state.camera.x + state.camera.width) / TILE_SIZE) + WORLD_STREAM_KEEP_BUFFER_TILES,
);
// Furnace logic
for (const [id, f] of Object.entries(state.furnaces)) {
  const furnace = f as FurnaceData;
  // Check if furnace block still exists
  const numKey = Number(id);
  const fx = Math.floor(numKey / WORLD_HEIGHT);
  const fy = numKey % WORLD_HEIGHT;
  if (isNaN(fx) || isNaN(fy) || fx < 0 || fx >= WORLD_WIDTH || fy < 0 || fy >= WORLD_HEIGHT) {
    delete state.furnaces[id];
    continue;
  }
  if (fx >= loadedMinX && fx <= loadedMaxX && state.world[fx] && state.world[fx][fy] !== BlockType.FURNACE) {
    // Drop contents if broken
    const dropItem = (item: { type: BlockType, count: number } | null) => {
      if (item) {
        for (let i = 0; i < item.count; i++) {
          state.droppedItems.push({
            x: fx * TILE_SIZE + 8,
            y: fy * TILE_SIZE + 8,
            vx: (Math.random() - 0.5) * 4,
            vy: -4,
            type: item.type,
            id: Math.random()
          });
        }
      }
    };
    dropItem(furnace.input);
    dropItem(furnace.fuel);
    dropItem(furnace.output);
    delete state.furnaces[id];
    if (state.openFurnaceId === id) {
      window.dispatchEvent(new CustomEvent('forceCloseInventory'));
    }
    continue;
  }

  let isSmelting = false;

  if (furnace.fuelLeft > 0) {
    furnace.fuelLeft--;
    isSmelting = true;
  }

  const smeltResult = furnace.input ? getSmeltResult(furnace.input.type) : null;

  if (smeltResult && (!furnace.output || (furnace.output.type === smeltResult && furnace.output.count < 64))) {
    if (furnace.fuelLeft <= 0 && furnace.fuel) {
      // Consume fuel
      const fuelTicks = getFuelTicks(furnace.fuel.type);

      if (fuelTicks > 0) {
        furnace.fuelLeft = fuelTicks;
        furnace.maxFuel = fuelTicks;
        furnace.fuel.count--;
        if (furnace.fuel.count <= 0) furnace.fuel = null;
        isSmelting = true;
      }
    }

    if (isSmelting) {
      furnace.progress++;
      if (furnace.progress >= 600) { // 10 seconds to smelt
        furnace.progress = 0;
        furnace.input.count--;
        if (furnace.input.count <= 0) furnace.input = null;
        
        if (furnace.output) {
          furnace.output.count++;
        } else {
          furnace.output = { type: smeltResult, count: 1 };
        }
      }
    } else {
      furnace.progress = 0;
    }
  } else {
    furnace.progress = 0;
  }
  
  // Sync UI if this furnace is open
  if (state.openFurnaceId === id) {
    setFurnaceUI({ ...furnace });
  }
}
};

export const advanceWorldState = ({
  canvas,
  state,
}: {
  canvas: HTMLCanvasElement;
  state: GameState;
}) => {
const { player } = state;

// Tick logic (Healing & Starvation)
state.tick++;
state.timeOfDay = (state.timeOfDay + 1) % 7200;

// Update flowers based on time of day and weather
if (state.tick % 60 === 0) { // Every second
  const isDaytime = state.timeOfDay > 1800 && state.timeOfDay < 5400;
  const isRaining = state.weather === Weather.RAIN || state.weather === Weather.STORM;
  const shouldBloom = isDaytime || isRaining;

  // Scan visible area
  const startX = Math.max(0, Math.floor(state.camera.x / TILE_SIZE) - 5);
  const endX = Math.min(WORLD_WIDTH - 1, Math.floor((state.camera.x + state.camera.width) / TILE_SIZE) + 5);
  const startY = Math.max(0, Math.floor(state.camera.y / TILE_SIZE) - 5);
  const endY = Math.min(WORLD_HEIGHT - 1, Math.floor((state.camera.y + state.camera.height) / TILE_SIZE) + 5);

  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      const block = state.world[x][y];
      if (block === BlockType.FLOWER_BUD && shouldBloom) {
        if (Math.random() < 0.2) { // 20% chance to bloom per second when conditions are met
          state.world[x][y] = BlockType.FLOWER_BLOOM;
        }
      } else if (block === BlockType.FLOWER_BLOOM && !shouldBloom) {
        if (Math.random() < 0.2) { // 20% chance to close per second when conditions are not met
          state.world[x][y] = BlockType.FLOWER_BUD;
        }
      }
    }
  }
}

state.weatherTimer--;
if (state.weatherTimer <= 0) {
  const rand = Math.random();
  if (rand < 0.6) state.weather = Weather.CLEAR;
  else if (rand < 0.8) state.weather = Weather.RAIN;
  else if (rand < 0.9) state.weather = Weather.SNOW;
  else state.weather = Weather.STORM;
  state.weatherTimer = 3600 + Math.floor(Math.random() * 3600); // 1-2 minutes
}

if (state.tick % 120 === 0) { // Every 2 seconds
  if (player.hunger >= 9 && player.health < player.maxHealth) {
    player.health += 1;
    player.exhaustion += 5; // Healing costs exhaustion
  } else if (player.hunger === 0) {
    player.health -= 1;
  }
}

// Update camera
state.camera.width = canvas.width;
state.camera.height = canvas.height;
state.camera.x = player.x + player.width / 2 - state.camera.width / 2;
state.camera.y = player.y + player.height / 2 - state.camera.height / 2;

// Clamp camera to world bounds
state.camera.x = Math.max(0, Math.min(state.camera.x, WORLD_WIDTH * TILE_SIZE - state.camera.width));
state.camera.y = Math.max(0, Math.min(state.camera.y, WORLD_HEIGHT * TILE_SIZE - state.camera.height));
applyWorldStreamingWindow(state);
};

export const playDamageSound = (state: GameState, oldHealth: number) => {
  if (state.player.health < oldHealth) {
    soundEngine.damage();
  }
};
