import { BlockType } from './types';
import { COCOA_TOOL_BLOCKS, isTreeBlock, MAX_DURABILITY } from './constants';

type CraftingSlot = { type: BlockType; count: number } | null;

export const getMaxStack = (type: BlockType): number => {
  if (MAX_DURABILITY[type] !== undefined) return 1;
  if (COCOA_TOOL_BLOCKS.includes(type)) return 1;
  if (
    [
      BlockType.COCOA_HELMET,
      BlockType.COCOA_CHESTPLATE,
      BlockType.COCOA_LEGGINGS,
      BlockType.COCOA_BOOTS,
    ].includes(type)
  ) {
    return 1;
  }
  return 64;
};

// ---------------------------------------------------------------------------
// Pattern-matching helper
// ---------------------------------------------------------------------------
// A recipe pattern is a 2-D array (rows × cols) of BlockType | null.
// null means "this cell must be empty".
// The helper tries every valid top-left offset so recipes work anywhere in
// the 3×3 grid; cells outside the placed pattern must also be empty.
// ---------------------------------------------------------------------------
type Pattern = (BlockType | null)[][];

const tryMatchAt = (
  types: (BlockType | null)[],
  pattern: Pattern,
  rowOff: number,
  colOff: number,
  mirror: boolean,
): boolean => {
  const GRID = 3;
  const patRows = pattern.length;
  const patCols = Math.max(0, ...pattern.map(r => r.length));
  outer: for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const pr = r - rowOff;
      const pc = mirror ? patCols - 1 - (c - colOff) : c - colOff;
      const inPat = pr >= 0 && pr < patRows && pc >= 0 && pc < patCols;
      const expected = inPat ? (pattern[pr][pc] ?? null) : null;
      if (types[r * GRID + c] !== expected) { return false; }
    }
  }
  return true;
};

const matchPattern = (types: (BlockType | null)[], pattern: Pattern): boolean => {
  const GRID = 3;
  const patRows = pattern.length;
  const patCols = Math.max(0, ...pattern.map(r => r.length));
  for (let rowOff = 0; rowOff <= GRID - patRows; rowOff++) {
    for (let colOff = 0; colOff <= GRID - patCols; colOff++) {
      if (tryMatchAt(types, pattern, rowOff, colOff, false)) return true;
      if (tryMatchAt(types, pattern, rowOff, colOff, true))  return true;
    }
  }
  return false;
};

export const checkCrafting = (
  grid: CraftingSlot[],
): { type: BlockType; count: number } | null => {
  const types = grid.map((slot) => (slot ? slot.type : null));

  if (types.every(t => t === null)) return null;

  // Shorthand aliases used in patterns below (null = empty slot)
  const P  = BlockType.PLANKS;
  const S  = BlockType.STICK;
  const F  = BlockType.FANG;
  const St = BlockType.STONE;
  const D  = BlockType.DIRT;
  const I  = BlockType.IRON_INGOT;
  const G  = BlockType.GOLD_INGOT;
  const Di = BlockType.DIAMOND;
  const C  = BlockType.COCOA_FUR;
  const _  = null; // empty slot

  // Any log → 4 planks
  if (
    matchPattern(types, [[BlockType.WOOD]]) ||
    matchPattern(types, [[BlockType.PINE_WOOD]]) ||
    matchPattern(types, [[BlockType.PALM_WOOD]])
  ) return { type: BlockType.PLANKS, count: 4 };

  // 2 planks (vertical) → 4 sticks
  if (matchPattern(types, [[P], [P]])) return { type: BlockType.STICK, count: 4 };

  // Wooden Sword: planks-planks-stick column
  if (matchPattern(types, [[P], [P], [S]])) return { type: BlockType.WOODEN_SWORD, count: 1 };

  // Fang Lance: fang above stick
  if (matchPattern(types, [[F], [S]])) return { type: BlockType.FANG_LANCE, count: 1 };

  // Cocoa tools
  if (matchPattern(types, [[C], [C], [S]])) return { type: BlockType.COCOA_SWORD, count: 1 };
  if (matchPattern(types, [[C], [S], [S]])) return { type: BlockType.COCOA_SPEAR, count: 1 };
  if (matchPattern(types, [
    [C, C],
    [C, S],
    [ _, S],
  ])) return { type: BlockType.COCOA_AXE, count: 1 };
  if (matchPattern(types, [
    [C, C, C],
    [ _, S, _],
    [S, S, S],
  ])) return { type: BlockType.COCOA_HAMMER, count: 1 };
  if (matchPattern(types, [
    [C, C, C],
    [ _, S, _],
    [ _, S, _],
  ])) return { type: BlockType.COCOA_PICKAXE, count: 1 };

  // 2×2 stone → 4 bricks
  if (matchPattern(types, [[St, St], [St, St]])) return { type: BlockType.BRICKS, count: 4 };

  // Hollow 3×3 stone ring → furnace
  if (matchPattern(types, [
    [St, St, St],
    [St,  _, St],
    [St, St, St],
  ])) return { type: BlockType.FURNACE, count: 1 };

  // 2 dirt (vertical) → grass
  if (matchPattern(types, [[D], [D]])) return { type: BlockType.GRASS, count: 1 };

  // Swords: material-material-stick column
  const SWORDS: [BlockType, BlockType][] = [
    [St, BlockType.STONE_SWORD],
    [I,  BlockType.IRON_SWORD],
    [G,  BlockType.GOLD_SWORD],
    [Di, BlockType.DIAMOND_SWORD],
  ];
  for (const [mat, result] of SWORDS) {
    if (matchPattern(types, [[mat], [mat], [S]])) return { type: result, count: 1 };
  }

  // Pickaxes: 3-material top row + 2 sticks down centre
  const PICKAXES: [BlockType, BlockType][] = [
    [BlockType.PLANKS,     BlockType.WOODEN_PICKAXE],
    [BlockType.STONE,      BlockType.STONE_PICKAXE],
    [BlockType.IRON_INGOT, BlockType.IRON_PICKAXE],
    [BlockType.GOLD_INGOT, BlockType.GOLD_PICKAXE],
    [BlockType.DIAMOND,    BlockType.DIAMOND_PICKAXE],
  ];
  for (const [mat, result] of PICKAXES) {
    if (matchPattern(types, [
      [mat, mat, mat],
      [ _,   S,  _],
      [ _,   S,  _],
    ])) return { type: result, count: 1 };
  }

  return null;
};

export const getRequiredProgress = (
  type: BlockType,
  selectedBlock: BlockType,
  hasItem: boolean,
  isFlying: boolean = false,
) => {
  if (isFlying) {
    return { requiredProgress: 0, canMine: true };
  }

  const getPickaxeTier = (item: BlockType) => {
    if (!hasItem) return 0;
    if (item === BlockType.WOODEN_PICKAXE) return 1;
    if (item === BlockType.STONE_PICKAXE) return 2;
    if (item === BlockType.IRON_PICKAXE) return 3;
    if (item === BlockType.GOLD_PICKAXE) return 4;
    if (item === BlockType.DIAMOND_PICKAXE) return 5;
    if (item === BlockType.COCOA_PICKAXE) return 6;
    return 0;
  };

  const toolTier = getPickaxeTier(selectedBlock);
  let requiredProgress = 15;
  let canMine = true;

  if (selectedBlock === BlockType.COCOA_PICKAXE && hasItem) {
    return { requiredProgress: 0, canMine: true };
  }

  if (selectedBlock === BlockType.COCOA_AXE && hasItem && isTreeBlock(type)) {
    return { requiredProgress: 0, canMine: true };
  }

  if (
    type === BlockType.TALL_GRASS ||
    type === BlockType.FLOWER_BUD ||
    type === BlockType.FLOWER_BLOOM
  ) {
    requiredProgress = 2;
  } else if (type === BlockType.STONE || type === BlockType.FURNACE) {
    if (toolTier < 1) canMine = false;
    requiredProgress = 60;
  } else if (type === BlockType.COAL_ORE) {
    if (toolTier < 1) canMine = false;
    requiredProgress = 60;
  } else if (type === BlockType.IRON_ORE) {
    if (toolTier < 2) canMine = false;
    requiredProgress = 90;
  } else if (type === BlockType.GOLD_ORE || type === BlockType.DIAMOND_ORE) {
    if (toolTier < 3) canMine = false;
    requiredProgress = 120;
  } else if (
    type === BlockType.WOOD ||
    type === BlockType.PLANKS ||
    type === BlockType.PINE_WOOD ||
    type === BlockType.PALM_WOOD
  ) {
    requiredProgress = 45;
  } else if (type === BlockType.MAGMA) {
    if (toolTier < 2) canMine = false;
    requiredProgress = 120;
  } else if (type === BlockType.OBSIDIAN) {
    if (toolTier < 5) canMine = false;
    requiredProgress = 300;
  } else if (
    type === BlockType.DIRT ||
    type === BlockType.GRASS ||
    type === BlockType.SAND ||
    type === BlockType.SNOW_DIRT ||
    type === BlockType.SNOW_GRASS
  ) {
    requiredProgress = 15;
  } else if (
    type === BlockType.LEAVES ||
    type === BlockType.PINE_LEAVES ||
    type === BlockType.PALM_LEAVES
  ) {
    requiredProgress = 5;
  }

  if (toolTier > 0 && canMine) {
    requiredProgress = Math.max(5, requiredProgress - toolTier * 10);
  }

  return { requiredProgress, canMine };
};
