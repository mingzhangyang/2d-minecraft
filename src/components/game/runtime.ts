import { MAX_DURABILITY, SPAWN_X, TILE_SIZE } from './constants';
import { createEmptyInventory } from './state';
import {
  Animal,
  BlockType,
  Camera,
  DroppedItem,
  FurnaceData,
  Player,
  Weather,
} from './types';
import { generateWorld, getSurfaceY, spawnAnimals } from './world';

export type InventoryStack = { type: BlockType; count: number };
export type HoveredSlot =
  | { type: 'inventory'; block: BlockType }
  | { type: 'crafting'; index: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type FurnaceSlotType = 'input' | 'fuel' | 'output';

export type GameHistoryEntry = {
  player: Player;
  /** Full state of every animal inside the snapshot zone at capture time. */
  nearbyAnimals: Animal[];
  /** IDs of ALL animals alive at capture time (used to cull post-snapshot spawns on rewind). */
  allAnimalIds: number[];
  /** Full state of every dropped item inside the snapshot zone at capture time. */
  nearbyItems: DroppedItem[];
  /** IDs of ALL dropped items alive at capture time. */
  allItemIds: number[];
  tick: number;
  timeOfDay: number;
  camera: Camera;
};

export type GameState = {
  tick: number;
  isDead: boolean;
  autoRespawn: boolean;
  isInventoryOpen: boolean;
  openFurnaceId: string | null;
  timeOfDay: number;
  weather: Weather;
  weatherTimer: number;
  invChanged: boolean;
  selectedBlock: BlockType;
  actionCooldown: number;
  world: ReturnType<typeof generateWorld>;
  mining: { x: number; y: number; progress: number };
  droppedItems: DroppedItem[];
  animals: Animal[];
  furnaces: Record<string, FurnaceData>;
  discoveredItems: Record<number, boolean>;
  history: GameHistoryEntry[]; // kept for potential future use; rewind uses a module-level circular buffer
  cocoaCatDefeated: boolean;
  player: Player;
  camera: Camera;
  keys: Record<string, boolean>;
  mouse: { x: number; y: number; leftDown: boolean; rightDown: boolean };
};

const RAW_MEAT_BLOCKS = new Set<BlockType>([
  BlockType.MEAT,
  BlockType.BEEF,
  BlockType.PORK,
  BlockType.CHICKEN_MEAT,
  BlockType.FISH_MEAT,
]);
const COOKED_MEAT_BLOCKS = new Set<BlockType>([
  BlockType.COOKED_MEAT,
  BlockType.COOKED_BEEF,
  BlockType.COOKED_PORK,
  BlockType.COOKED_CHICKEN_MEAT,
  BlockType.COOKED_FISH_MEAT,
]);
const TAMEABLE_FOOD_BLOCKS = new Set<BlockType>([
  BlockType.MEAT,
  BlockType.COOKED_MEAT,
  BlockType.BEEF,
  BlockType.COOKED_BEEF,
  BlockType.PORK,
  BlockType.COOKED_PORK,
  BlockType.CHICKEN_MEAT,
  BlockType.COOKED_CHICKEN_MEAT,
  BlockType.FISH_MEAT,
  BlockType.COOKED_FISH_MEAT,
]);

export const isRawMeat = (block: BlockType) => RAW_MEAT_BLOCKS.has(block);
export const isCookedMeat = (block: BlockType) => COOKED_MEAT_BLOCKS.has(block);
export const isTamingFood = (block: BlockType) => TAMEABLE_FOOD_BLOCKS.has(block);

export const getSmeltResult = (inputType: BlockType) => {
  if (inputType === BlockType.MEAT) return BlockType.COOKED_MEAT;
  if (inputType === BlockType.BEEF) return BlockType.COOKED_BEEF;
  if (inputType === BlockType.PORK) return BlockType.COOKED_PORK;
  if (inputType === BlockType.CHICKEN_MEAT) return BlockType.COOKED_CHICKEN_MEAT;
  if (inputType === BlockType.FISH_MEAT) return BlockType.COOKED_FISH_MEAT;
  if (inputType === BlockType.IRON_ORE) return BlockType.IRON_INGOT;
  if (inputType === BlockType.GOLD_ORE) return BlockType.GOLD_INGOT;
  return null;
};

export const getFuelTicks = (fuelType: BlockType) => {
  if (fuelType === BlockType.PLANKS) return 600;
  if (
    fuelType === BlockType.WOOD ||
    fuelType === BlockType.PINE_WOOD ||
    fuelType === BlockType.PALM_WOOD ||
    fuelType === BlockType.COAL
  ) {
    return 2400;
  }
  return 0;
};

export const isValidFurnaceInput = (block: BlockType) => getSmeltResult(block) !== null;
export const isValidFurnaceFuel = (block: BlockType) => getFuelTicks(block) > 0;

export const COCOA_TOOL_BLOCKS: BlockType[] = [
  BlockType.COCOA_SWORD,
  BlockType.COCOA_AXE,
  BlockType.COCOA_HAMMER,
  BlockType.COCOA_PICKAXE,
  BlockType.COCOA_SPEAR,
];

export const grantCocoaStarterKit = (
  player: Player,
  discoveredItems?: Record<number, boolean>,
): void => {
  for (const tool of COCOA_TOOL_BLOCKS) {
    if ((player.inventory[tool] ?? 0) < 1) {
      player.inventory[tool] = 1;
    }
    if (MAX_DURABILITY[tool] !== undefined) {
      player.durability[tool] = MAX_DURABILITY[tool];
    }
    if (discoveredItems) {
      discoveredItems[tool] = true;
    }
  }
};

export const createInitialPlayer = (): Player => {
  const player: Player = {
    inventory: createEmptyInventory(),
    x: SPAWN_X * TILE_SIZE,
    y: (getSurfaceY(SPAWN_X) - 2) * TILE_SIZE,
    vx: 0,
    vy: 0,
    width: 24,
    height: 48,
    grounded: false,
    health: 10,
    maxHealth: 10,
    hunger: 10,
    maxHunger: 10,
    exhaustion: 0,
    fallStartY: undefined,
    hurtTime: 0,
    poisonTimer: 0,
    poisonTick: 0,
    isFlying: false,
    breath: 600,
    maxBreath: 600,
    attackTimer: 0,
    durability: { ...MAX_DURABILITY },
  };
  grantCocoaStarterKit(player);
  return player;
};

/** Returns true when the player has a full set of Cocoa Cat armour equipped. */
export const hasFullCocoaArmor = (player: Player): boolean =>
  (player.inventory[BlockType.COCOA_HELMET]     ?? 0) > 0 &&
  (player.inventory[BlockType.COCOA_CHESTPLATE] ?? 0) > 0 &&
  (player.inventory[BlockType.COCOA_LEGGINGS]   ?? 0) > 0 &&
  (player.inventory[BlockType.COCOA_BOOTS]      ?? 0) > 0;

export const clonePlayer = (player: Player): Player => ({
  ...player,
  inventory: { ...player.inventory },
  durability: { ...player.durability },
});

export const createInitialGameState = (): GameState => {
  const world = generateWorld();
  const discoveredItems: Record<number, boolean> = {};
  const player = createInitialPlayer();
  grantCocoaStarterKit(player, discoveredItems);

  return {
    tick: 0,
    isDead: false,
    autoRespawn: false,
    isInventoryOpen: false,
    openFurnaceId: null,
    timeOfDay: 3600,
    weather: Weather.CLEAR,
    weatherTimer: 3600,
    invChanged: true,
    selectedBlock: BlockType.AIR,
    actionCooldown: 0,
    world,
    mining: { x: -1, y: -1, progress: 0 },
    droppedItems: [],
    animals: spawnAnimals(world),
    furnaces: {},
    discoveredItems,
    history: [],
    cocoaCatDefeated: false,
    player,
    camera: {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    },
    keys: {},
    mouse: { x: 0, y: 0, leftDown: false, rightDown: false },
  };
};

export const respawnPlayer = (state: GameState) => {
  state.player.health = state.player.maxHealth;
  state.player.hunger = state.player.maxHunger;
  state.player.exhaustion = 0;
  state.player.hurtTime = 0;
  state.player.poisonTimer = 0;
  state.player.poisonTick = 0;
  state.player.x = SPAWN_X * TILE_SIZE;
  state.player.y = (getSurfaceY(SPAWN_X) - 2) * TILE_SIZE;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.isFlying = false;
  state.player.breath = state.player.maxBreath;
  state.player.attackTimer = 0;
  state.player.fallStartY = undefined;
  state.isDead = false;
};
