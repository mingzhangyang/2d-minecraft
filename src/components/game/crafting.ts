import { BlockType } from './types';
import { MAX_DURABILITY } from './constants';

type CraftingSlot = { type: BlockType; count: number } | null;

export const getMaxStack = (type: BlockType): number => {
  if (MAX_DURABILITY[type] !== undefined) return 1;
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

export const checkCrafting = (
  grid: CraftingSlot[],
): { type: BlockType; count: number } | null => {
  const types = grid.map((slot) => (slot ? slot.type : null));

  let totalItems = 0;
  const counts = new Map<BlockType, number>();
  for (const t of types) {
    if (t !== null) {
      totalItems++;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }

  if (totalItems === 0) return null;

  if (
    totalItems === 1 &&
    (counts.get(BlockType.WOOD) === 1 ||
      counts.get(BlockType.PINE_WOOD) === 1 ||
      counts.get(BlockType.PALM_WOOD) === 1)
  ) {
    return { type: BlockType.PLANKS, count: 4 };
  }

  if (totalItems === 2 && counts.get(BlockType.PLANKS) === 2) {
    for (let i = 0; i < 6; i++) {
      if (types[i] === BlockType.PLANKS && types[i + 3] === BlockType.PLANKS) {
        return { type: BlockType.STICK, count: 4 };
      }
    }
  }

  // Wooden Sword: 2 planks, 1 stick
  if (
    totalItems === 3 &&
    counts.get(BlockType.PLANKS) === 2 &&
    counts.get(BlockType.STICK) === 1
  ) {
    for (let i = 0; i < 3; i++) {
      if (
        types[i] === BlockType.PLANKS &&
        types[i + 3] === BlockType.PLANKS &&
        types[i + 6] === BlockType.STICK
      ) {
        return { type: BlockType.WOODEN_SWORD, count: 1 };
      }
    }
  }

  // Fang Lance: 1 fang, 1 stick
  if (
    totalItems === 2 &&
    counts.get(BlockType.FANG) === 1 &&
    counts.get(BlockType.STICK) === 1
  ) {
    for (let i = 0; i < 6; i++) {
      if (types[i] === BlockType.FANG && types[i + 3] === BlockType.STICK) {
        return { type: BlockType.FANG_LANCE, count: 1 };
      }
    }
  }

  if (totalItems === 4 && counts.get(BlockType.STONE) === 4) {
    const is2x2 =
      (types[0] === BlockType.STONE &&
        types[1] === BlockType.STONE &&
        types[3] === BlockType.STONE &&
        types[4] === BlockType.STONE) ||
      (types[1] === BlockType.STONE &&
        types[2] === BlockType.STONE &&
        types[4] === BlockType.STONE &&
        types[5] === BlockType.STONE) ||
      (types[3] === BlockType.STONE &&
        types[4] === BlockType.STONE &&
        types[6] === BlockType.STONE &&
        types[7] === BlockType.STONE) ||
      (types[4] === BlockType.STONE &&
        types[5] === BlockType.STONE &&
        types[7] === BlockType.STONE &&
        types[8] === BlockType.STONE);
    if (is2x2) return { type: BlockType.BRICKS, count: 4 };
  }

  if (totalItems === 8 && counts.get(BlockType.STONE) === 8 && types[4] === null) {
    return { type: BlockType.FURNACE, count: 1 };
  }

  if (totalItems === 2 && counts.get(BlockType.DIRT) === 2) {
    for (let i = 0; i < 6; i++) {
      if (types[i] === BlockType.DIRT && types[i + 3] === BlockType.DIRT) {
        return { type: BlockType.GRASS, count: 1 };
      }
    }
  }

  // Pickaxes: 3 material on top, 2 sticks below
  if (totalItems === 5 && types[4] === BlockType.STICK && types[7] === BlockType.STICK) {
    if (
      types[0] === BlockType.PLANKS &&
      types[1] === BlockType.PLANKS &&
      types[2] === BlockType.PLANKS
    ) {
      return { type: BlockType.WOODEN_PICKAXE, count: 1 };
    }
    if (
      types[0] === BlockType.STONE &&
      types[1] === BlockType.STONE &&
      types[2] === BlockType.STONE
    ) {
      return { type: BlockType.STONE_PICKAXE, count: 1 };
    }
    if (
      types[0] === BlockType.IRON_INGOT &&
      types[1] === BlockType.IRON_INGOT &&
      types[2] === BlockType.IRON_INGOT
    ) {
      return { type: BlockType.IRON_PICKAXE, count: 1 };
    }
    if (
      types[0] === BlockType.GOLD_INGOT &&
      types[1] === BlockType.GOLD_INGOT &&
      types[2] === BlockType.GOLD_INGOT
    ) {
      return { type: BlockType.GOLD_PICKAXE, count: 1 };
    }
    if (
      types[0] === BlockType.DIAMOND &&
      types[1] === BlockType.DIAMOND &&
      types[2] === BlockType.DIAMOND
    ) {
      return { type: BlockType.DIAMOND_PICKAXE, count: 1 };
    }
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
    return 0;
  };

  const toolTier = getPickaxeTier(selectedBlock);
  let requiredProgress = 15;
  let canMine = true;

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
