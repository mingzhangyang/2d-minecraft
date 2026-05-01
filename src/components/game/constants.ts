import { BlockType } from './types';

// ---------------------------------------------------------------------------
// Block classification predicates
// These are pure, static lookup functions and belong here rather than in
// runtime.ts, which owns GameState shape and initial-value factories.
// ---------------------------------------------------------------------------

export const DECORATION_BLOCKS = new Set<BlockType>([
  BlockType.TALL_GRASS,
  BlockType.FLOWER_BUD,
  BlockType.FLOWER_BLOOM,
]);

export const TRANSPARENT_BLOCKS = new Set<BlockType>([BlockType.AIR, ...DECORATION_BLOCKS]);

export const NON_COLLIDING_BLOCKS = new Set<BlockType>([
  BlockType.AIR,
  BlockType.TALL_GRASS,
  BlockType.FLOWER_BUD,
  BlockType.FLOWER_BLOOM,
  BlockType.WATER,
  BlockType.CACTUS,
  BlockType.MAGMA,
  BlockType.COCOA_PORTAL,
]);

export const REPLACEABLE_BLOCKS = new Set<BlockType>([
  BlockType.AIR,
  BlockType.TALL_GRASS,
  BlockType.FLOWER_BUD,
  BlockType.FLOWER_BLOOM,
  BlockType.WATER,
  BlockType.MAGMA,
]);

export const TREE_BLOCKS = new Set<BlockType>([
  BlockType.WOOD,
  BlockType.PINE_WOOD,
  BlockType.PALM_WOOD,
  BlockType.LEAVES,
  BlockType.PINE_LEAVES,
  BlockType.PALM_LEAVES,
]);

export const isDecorationBlock  = (b: BlockType): boolean => DECORATION_BLOCKS.has(b);
export const isTransparentBlock = (b: BlockType): boolean => TRANSPARENT_BLOCKS.has(b);
export const isNonCollidingBlock = (b: BlockType): boolean => NON_COLLIDING_BLOCKS.has(b);
export const isReplaceableBlock = (b: BlockType): boolean => REPLACEABLE_BLOCKS.has(b);
export const isTreeBlock        = (b: BlockType): boolean => TREE_BLOCKS.has(b);

export const TILE_SIZE = 32;
export const WORLD_WIDTH = 100000;
export const WORLD_HEIGHT = 64;
export const GRAVITY = 0.4;
export const JUMP_FORCE = -8;
export const MOVE_SPEED = 4;
export const REACH = TILE_SIZE * 5;
const clampHugeNumber = (value: number): number =>
  Number.isFinite(value) ? value : Number.MAX_VALUE;

export const COCOA_CAT_HEALTH = clampHugeNumber(1e1000000);
export const COCOA_SWORD_DAMAGE = clampHugeNumber(1e3424);
export const COCOA_HAMMER_BASE_DAMAGE = clampHugeNumber(1e456);
export const COCOA_HAMMER_JUMP_BONUS_DAMAGE = 1e32;
export const COCOA_SPEAR_DAMAGE = clampHugeNumber(1e346);

export const getToolReach = (selectedBlock: BlockType): number => {
  if (selectedBlock === BlockType.COCOA_SPEAR) return Number.POSITIVE_INFINITY;
  if (selectedBlock === BlockType.FANG_LANCE) return REACH * 1.5;
  return REACH;
};

export const STARS = Array.from({ length: 150 }).map(() => ({
  x: Math.random(),
  y: Math.random() * 0.7, // Top 70% of the screen
  size: Math.random() * 1.5 + 0.5,
  twinkleSpeed: Math.random() * 0.05 + 0.01,
}));

export const BLOCK_COLORS: Record<BlockType, string> = {
  [BlockType.AIR]: 'transparent',
  [BlockType.DIRT]: '#8B4513',
  [BlockType.GRASS]: '#4CAF50',
  [BlockType.STONE]: '#9E9E9E',
  [BlockType.WOOD]: '#5D4037',
  [BlockType.LEAVES]: '#2E7D32',
  [BlockType.PLANKS]: '#D7CCC8',
  [BlockType.BRICKS]: '#D32F2F',
  [BlockType.APPLE]: '#E53935',
  [BlockType.COAL_ORE]: '#1a1a1a',
  [BlockType.IRON_ORE]: '#E6C280',
  [BlockType.GOLD_ORE]: '#FFD700',
  [BlockType.DIAMOND_ORE]: '#00E5FF',
  [BlockType.WORM]: '#FF8DA1',
  [BlockType.MEAT]: '#E57373',
  [BlockType.COAL]: '#212121',
  [BlockType.FURNACE]: '#616161',
  [BlockType.COOKED_MEAT]: '#795548',
  [BlockType.TALL_GRASS]: '#4CAF50',
  [BlockType.SAND]: '#EEDD82',
  [BlockType.SNOW_GRASS]: '#FFFFFF',
  [BlockType.SNOW_DIRT]: '#8B4513',
  [BlockType.STICK]: '#8B5A2B',
  [BlockType.FANG]: '#F5F5DC',
  [BlockType.WOODEN_SWORD]: '#8B5A2B',
  [BlockType.FANG_LANCE]: '#F5F5DC',
  [BlockType.CACTUS]: '#2E7D32',
  [BlockType.WATER]: 'rgba(33, 150, 243, 0.6)',
  [BlockType.CORAL]: '#FF7F50',
  [BlockType.IRON_INGOT]: 'transparent',
  [BlockType.GOLD_INGOT]: 'transparent',
  [BlockType.DIAMOND]: 'transparent',
  [BlockType.WOODEN_PICKAXE]: 'transparent',
  [BlockType.STONE_PICKAXE]: 'transparent',
  [BlockType.IRON_PICKAXE]: 'transparent',
  [BlockType.GOLD_PICKAXE]: 'transparent',
  [BlockType.DIAMOND_PICKAXE]: 'transparent',
  [BlockType.FLOWER_BUD]: 'transparent',
  [BlockType.FLOWER_BLOOM]: 'transparent',
  [BlockType.PINE_WOOD]: '#4E342E',
  [BlockType.PINE_LEAVES]: '#1B5E20',
  [BlockType.PALM_WOOD]: '#8D6E63',
  [BlockType.PALM_LEAVES]: '#689F38',
  [BlockType.MAGMA]: '#FF4500',
  [BlockType.OBSIDIAN]: '#110022',
  [BlockType.MUD]: '#3e2723',
  [BlockType.JUNGLE_WOOD]: '#3e2723',
  [BlockType.JUNGLE_LEAVES]: '#33691e',
  [BlockType.RED_SAND]: '#d84315',
  [BlockType.TERRACOTTA]: '#bf360c',
  [BlockType.BEEF]: '#b71c1c',
  [BlockType.COOKED_BEEF]: '#4e342e',
  [BlockType.PORK]: '#f48fb1',
  [BlockType.COOKED_PORK]: '#d81b60',
  [BlockType.CHICKEN_MEAT]: '#ffcdd2',
  [BlockType.COOKED_CHICKEN_MEAT]: '#d84315',
  [BlockType.FISH_MEAT]: '#e0f7fa',
  [BlockType.COOKED_FISH_MEAT]: '#006064',
  [BlockType.COCOA_PORTAL]: '#5d4037',
  [BlockType.COCOA_HELMET]: '#654321',
  [BlockType.COCOA_CHESTPLATE]: '#654321',
  [BlockType.COCOA_LEGGINGS]: '#654321',
  [BlockType.COCOA_BOOTS]: '#654321',
  [BlockType.COCOA_FUR]: '#4a3118',
  [BlockType.GOLD_BLOCK]: '#FBC02D',
  [BlockType.DIAMOND_BLOCK]: '#18FFFF',
  [BlockType.STONE_SWORD]: 'transparent',
  [BlockType.IRON_SWORD]: 'transparent',
  [BlockType.GOLD_SWORD]: 'transparent',
  [BlockType.DIAMOND_SWORD]: 'transparent',
  [BlockType.COCOA_SWORD]: 'transparent',
  [BlockType.COCOA_AXE]: 'transparent',
  [BlockType.COCOA_HAMMER]: 'transparent',
  [BlockType.COCOA_PICKAXE]: 'transparent',
  [BlockType.COCOA_SPEAR]: 'transparent',
};

export const INVENTORY_BLOCKS = [
  BlockType.DIRT,
  BlockType.GRASS,
  BlockType.STONE,
  BlockType.WOOD,
  BlockType.LEAVES,
  BlockType.PLANKS,
  BlockType.BRICKS,
  BlockType.APPLE,
  BlockType.COAL_ORE,
  BlockType.IRON_ORE,
  BlockType.GOLD_ORE,
  BlockType.DIAMOND_ORE,
  BlockType.WORM,
  BlockType.MEAT,
  BlockType.COAL,
  BlockType.FURNACE,
  BlockType.COOKED_MEAT,
  BlockType.BEEF,
  BlockType.COOKED_BEEF,
  BlockType.PORK,
  BlockType.COOKED_PORK,
  BlockType.CHICKEN_MEAT,
  BlockType.COOKED_CHICKEN_MEAT,
  BlockType.FISH_MEAT,
  BlockType.COOKED_FISH_MEAT,
  BlockType.COCOA_PORTAL,
  BlockType.COCOA_HELMET,
  BlockType.COCOA_CHESTPLATE,
  BlockType.COCOA_LEGGINGS,
  BlockType.COCOA_BOOTS,
  BlockType.COCOA_FUR,
  // Keep Cocoa tools near the center of the inventory grid.
  BlockType.COCOA_SWORD,
  BlockType.COCOA_AXE,
  BlockType.COCOA_HAMMER,
  BlockType.COCOA_PICKAXE,
  BlockType.COCOA_SPEAR,
  BlockType.TALL_GRASS,
  BlockType.STICK,
  BlockType.FANG,
  BlockType.WOODEN_SWORD,
  BlockType.FANG_LANCE,
  BlockType.CACTUS,
  BlockType.WATER,
  BlockType.CORAL,
  BlockType.IRON_INGOT,
  BlockType.GOLD_INGOT,
  BlockType.DIAMOND,
  BlockType.WOODEN_PICKAXE,
  BlockType.STONE_PICKAXE,
  BlockType.IRON_PICKAXE,
  BlockType.GOLD_PICKAXE,
  BlockType.DIAMOND_PICKAXE,
  BlockType.FLOWER_BUD,
  BlockType.FLOWER_BLOOM,
  BlockType.PINE_WOOD,
  BlockType.PINE_LEAVES,
  BlockType.PALM_WOOD,
  BlockType.PALM_LEAVES,
  BlockType.MAGMA,
  BlockType.OBSIDIAN,
  BlockType.SNOW_DIRT,
  BlockType.SNOW_GRASS,
  BlockType.STONE_SWORD,
  BlockType.IRON_SWORD,
  BlockType.GOLD_SWORD,
  BlockType.DIAMOND_SWORD,
];

export const MAX_DURABILITY: Record<number, number> = {
  [BlockType.WOODEN_PICKAXE]: 60,
  [BlockType.STONE_PICKAXE]: 132,
  [BlockType.IRON_PICKAXE]: 251,
  [BlockType.GOLD_PICKAXE]: 33,
  [BlockType.DIAMOND_PICKAXE]: 1562,
  [BlockType.WOODEN_SWORD]: 60,
  [BlockType.STONE_SWORD]: 132,
  [BlockType.IRON_SWORD]: 251,
  [BlockType.GOLD_SWORD]: 33,
  [BlockType.DIAMOND_SWORD]: 1562,
  [BlockType.FANG_LANCE]: 132,
  [BlockType.COCOA_SWORD]: 1000000000,
  [BlockType.COCOA_AXE]: 1000000000,
  [BlockType.COCOA_HAMMER]: 1000000000,
  [BlockType.COCOA_PICKAXE]: 1000000000,
  [BlockType.COCOA_SPEAR]: 1000000000,
};

export const SPAWN_X = 50;

export const BASE_ATTACK_DAMAGE = 2;

export const WEAPON_DAMAGE: Partial<Record<BlockType, number>> = {
  [BlockType.FANG]: 4,
  [BlockType.WOODEN_SWORD]: 5,
  [BlockType.STONE_SWORD]: 6,
  [BlockType.IRON_SWORD]: 7,
  [BlockType.GOLD_SWORD]: 6,
  [BlockType.DIAMOND_SWORD]: 9,
  [BlockType.FANG_LANCE]: 7,
  [BlockType.WOODEN_PICKAXE]: 3,
  [BlockType.STONE_PICKAXE]: 4,
  [BlockType.IRON_PICKAXE]: 5,
  [BlockType.GOLD_PICKAXE]: 3,
  [BlockType.DIAMOND_PICKAXE]: 6,
  [BlockType.COCOA_SWORD]: COCOA_SWORD_DAMAGE,
  [BlockType.COCOA_AXE]: 40,
  [BlockType.COCOA_HAMMER]: COCOA_HAMMER_BASE_DAMAGE,
  [BlockType.COCOA_PICKAXE]: 50,
  [BlockType.COCOA_SPEAR]: COCOA_SPEAR_DAMAGE,
};

export const POISON_WEAPONS = new Set<BlockType>([BlockType.FANG, BlockType.FANG_LANCE]);

// ---------------------------------------------------------------------------
// Animal behaviour distances (pixels unless noted)
// ---------------------------------------------------------------------------
/** Animals beyond this distance from the player are removed from the world. */
export const ANIMAL_DESPAWN_DISTANCE = 3000;
/** Animals will not spawn closer than this to the player. */
export const ANIMAL_SPAWN_MIN_DISTANCE = 400;
/** Aggressive animals lose their aggro when the player runs this far away. */
export const ANIMAL_AGGRO_LOSS_DISTANCE = 600;
/** Herbivores detect snakes within this radius and flee. */
export const PREY_FLEE_DETECTION_RADIUS = 200;
/** Ants flee from chickens and snakes within this radius. */
export const ANT_FLEE_DETECTION_RADIUS = 150;
/** Shark begins tracking the player when within this range (player must be in water). */
export const SHARK_ATTACK_RANGE = 300;
/** Orca searches for prey within this radius. */
export const ORCA_HUNT_RADIUS = 400;
/** Orca deals melee damage when within this distance of its target. */
export const ORCA_MELEE_RANGE = 40;
/** Distance at which herbivores scan for food items or grass. */
export const HERBIVORE_FOOD_SEEK_RANGE = 300;
/** Snakes search for prey within this radius. */
export const SNAKE_HUNT_RANGE = 250;
/** Ants scan for food items within this radius. */
export const ANT_FOOD_SEEK_RANGE = 200;
/** Big cats start hunting targets within this radius. */
export const CAT_VISION_RANGE = 400;
/** Tamed cats follow the player if the player is farther than this. */
export const CAT_TAMED_FOLLOW_DISTANCE = 100;
/** Snake launches itself at the player when within this horizontal distance. */
export const SNAKE_LAUNCH_RANGE = 120;
/** Snake and cat AABB melee range — attacks fire when within this many pixels. */
export const ANIMAL_MELEE_RANGE = 64;
/** Alert radius — hitting a snake alerts all snakes within this distance. */
export const SNAKE_ALERT_RADIUS = 400;
/** Cocoa Cat begins attacking when the player gets within this horizontal distance. */
export const COCOA_CAT_ATTACK_RANGE = 150;
/** Tile row threshold — Cocoa Cat activates when the player is above this Y (in tiles). */
export const COCOA_CAT_HEIGHT_THRESHOLD_TILES = 30;
/** Max horizontal distance at which big cats trigger a pounce leap. */
export const CAT_POUNCE_MAX_RANGE = 150;
/** Min horizontal distance required to pounce (prevents re-pouncing at point-blank). */
export const CAT_POUNCE_MIN_RANGE = 40;
/** Upward velocity applied when a big cat jumps over a wall or pounces. */
export const CAT_JUMP_VELOCITY = -11.3;
/** Birds stay at least this many pixels above the terrain surface. */
export const BIRD_MIN_HEIGHT_ABOVE_SURFACE = 50;
