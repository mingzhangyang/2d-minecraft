export enum BlockType {
  AIR = 0,
  DIRT = 1,
  GRASS = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  PLANKS = 6,
  BRICKS = 7,
  APPLE = 8,
  COAL_ORE = 9,
  IRON_ORE = 10,
  GOLD_ORE = 11,
  DIAMOND_ORE = 12,
  WORM = 13,
  MEAT = 14,
  COAL = 15,
  FURNACE = 16,
  COOKED_MEAT = 17,
  TALL_GRASS = 18,
  SAND = 19,
  CACTUS = 20,
  SNOW_GRASS = 21,
  SNOW_DIRT = 22,
  STICK = 23,
  FANG = 24,
  WOODEN_SWORD = 25,
  FANG_LANCE = 26,
  WATER = 27,
  CORAL = 28,
  IRON_INGOT = 29,
  GOLD_INGOT = 30,
  DIAMOND = 31,
  WOODEN_PICKAXE = 32,
  STONE_PICKAXE = 33,
  IRON_PICKAXE = 34,
  GOLD_PICKAXE = 35,
  DIAMOND_PICKAXE = 36,
  FLOWER_BUD = 37,
  FLOWER_BLOOM = 38,
  PINE_WOOD = 39,
  PINE_LEAVES = 40,
  PALM_WOOD = 41,
  PALM_LEAVES = 42,
  MAGMA = 43,
  OBSIDIAN = 44,
  MUD = 45,
  JUNGLE_WOOD = 46,
  JUNGLE_LEAVES = 47,
  RED_SAND = 48,
  TERRACOTTA = 49,
  BEEF = 50,
  COOKED_BEEF = 51,
  PORK = 52,
  COOKED_PORK = 53,
  CHICKEN_MEAT = 54,
  COOKED_CHICKEN_MEAT = 55,
  FISH_MEAT = 56,
  COOKED_FISH_MEAT = 57,
  COCOA_PORTAL = 58,
  COCOA_HELMET = 59,
  COCOA_CHESTPLATE = 60,
  COCOA_LEGGINGS = 61,
  COCOA_BOOTS = 62,
  COCOA_FUR = 63,
  GOLD_BLOCK = 64,
  DIAMOND_BLOCK = 65,
  STONE_SWORD = 66,
  IRON_SWORD = 67,
  GOLD_SWORD = 68,
  DIAMOND_SWORD = 69,
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  exhaustion: number;
  inventory: Record<number, number>;
  durability: Record<number, number>;
  fallStartY?: number;
  hurtTime: number;
  poisonTimer: number;
  poisonTick: number;
  isFlying: boolean;
  breath: number;
  maxBreath: number;
  attackTimer: number;
}

export interface DroppedItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: BlockType;
  id: number;
  pickupTimer?: number;
  sunExposureTimer?: number;
}

export enum AnimalType {
  PIG = 'PIG',
  COW = 'COW',
  CHICKEN = 'CHICKEN',
  SNAKE = 'SNAKE',
  STRIPED_SNAKE = 'STRIPED_SNAKE',
  TIGER_SNAKE = 'TIGER_SNAKE',
  ANT = 'ANT',
  BIRD = 'BIRD',
  FISH = 'FISH',
  ORCA = 'ORCA',
  DOLPHIN = 'DOLPHIN',
  SHARK = 'SHARK',
  LEOPARD = 'LEOPARD',
  JAGUAR = 'JAGUAR',
  BLACK_JAGUAR = 'BLACK_JAGUAR',
  COCOA_CAT = 'COCOA_CAT',
}

export enum Weather {
  CLEAR = 'CLEAR',
  RAIN = 'RAIN',
  SNOW = 'SNOW',
  STORM = 'STORM',
}

export interface Animal {
  id: number;
  type: AnimalType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: -1 | 1;
  state: 'idle' | 'walking' | 'launching' | 'attacking';
  stateTime: number;
  health: number;
  maxHealth: number;
  hurtTime: number;
  attackCooldown: number;
  launchCooldown: number;
  aggro: boolean;
  poisonTimer: number;
  poisonTick: number;
  regenTimer: number;
  tamed: boolean;
  attackTimer: number;
  attackPattern: 'normal' | 'lunge' | 'charge';
  chargeTimer: number;
  fallStartY?: number;
}

export interface FurnaceData {
  input: { type: BlockType; count: number } | null;
  fuel: { type: BlockType; count: number } | null;
  output: { type: BlockType; count: number } | null;
  progress: number;
  fuelLeft: number;
  maxFuel: number;
}

export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}
