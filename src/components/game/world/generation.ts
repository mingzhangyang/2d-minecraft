import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { BlockType } from '../types';

export const enum BiomeType {
  FOREST = 0,
  DESERT = 1,
  SNOW = 2,
  OCEAN = 3,
  MOUNTAIN = 4,
  SNOWY_MOUNTAIN = 5,
  VOLCANO = 6,
  SWAMP = 7,
  JUNGLE = 8,
  BADLANDS = 9,
}

export const getBiome = (x: number): BiomeType => Math.floor(x / 100) % 10 as BiomeType;

export const getSurfaceY = (x: number) => {
  if (x >= 89000) return Math.floor(WORLD_HEIGHT / 2);
  const biomeIndex = getBiome(x);
  if (biomeIndex === BiomeType.OCEAN) {
    return Math.floor(WORLD_HEIGHT / 2);
  }
  let heightOffset = Math.sin(x / 8) * 4 + Math.sin(x / 3) * 2;
  const biomePos = (x % 100) / 100;
  const mountainHeight = Math.sin(biomePos * Math.PI);

  if (biomeIndex === BiomeType.MOUNTAIN) {
    heightOffset -= mountainHeight * 25;
  } else if (biomeIndex === BiomeType.SNOWY_MOUNTAIN) {
    heightOffset -= mountainHeight * 15;
  } else if (biomeIndex === BiomeType.VOLCANO) {
    heightOffset -= mountainHeight * 20;
    if (biomePos > 0.4 && biomePos < 0.6) {
      heightOffset += 5;
    }
  } else if (biomeIndex === BiomeType.SWAMP) {
    heightOffset += 2;
  } else if (biomeIndex === BiomeType.BADLANDS) {
    heightOffset -= mountainHeight * 15;
  }

  let actualSurfaceY = Math.floor(WORLD_HEIGHT / 2 + heightOffset);
  if (biomeIndex === BiomeType.SWAMP) {
    actualSurfaceY += 1;
  }
  return actualSurfaceY;
};

type ColumnBaseData = {
  biomeIndex: BiomeType;
  biomePos: number;
  actualSurfaceY: number;
  topBlock: BlockType;
  subBlock: BlockType;
};

const WORLD_WATER_LEVEL = Math.floor(WORLD_HEIGHT / 2);
const PORTAL_COLUMNS = [1000, 2000, 3000, 89995];
const CASTLE_START_X = 90030;
const CASTLE_WIDTH = 80;
const CASTLE_HEIGHT = 35;
const CASTLE_Y = Math.floor(WORLD_HEIGHT / 2);
const THRONE_CENTER_X = CASTLE_START_X + Math.floor(CASTLE_WIDTH / 2);
const TREE_SALT = 11;
const TREE_HEIGHT_SALT = 12;
const GRASS_SALT = 13;
const FLOWER_SALT = 14;
const CACTUS_SALT = 15;
const CORAL_SALT = 16;
const ORE_SALT = 17;

const hash32 = (a: number, b: number, c: number) => {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = (h + Math.imul((b | 0) ^ 0xc2b2ae35, 0x27d4eb2d)) | 0;
  h = (h + Math.imul((c | 0) ^ 0x165667b1, 0x9e3779b1)) | 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
};

const rand01 = (a: number, b: number, c: number) => hash32(a, b, c) / 0x100000000;

const setColumnBlock = (column: BlockType[], y: number, block: BlockType) => {
  if (y >= 0 && y < WORLD_HEIGHT) {
    column[y] = block;
  }
};

const getColumnBaseData = (x: number): ColumnBaseData => {
  const biomeIndex = getBiome(x);
  const biomePos = (x % 100) / 100;
  let heightOffset = Math.sin(x / 8) * 4 + Math.sin(x / 3) * 2;
  const mountainHeight = Math.sin(biomePos * Math.PI);

  if (biomeIndex === BiomeType.MOUNTAIN) {
    heightOffset -= mountainHeight * 25;
  } else if (biomeIndex === BiomeType.SNOWY_MOUNTAIN) {
    heightOffset -= mountainHeight * 15;
  } else if (biomeIndex === BiomeType.VOLCANO) {
    heightOffset -= mountainHeight * 20;
    if (biomePos > 0.4 && biomePos < 0.6) {
      heightOffset += 5;
    }
  } else if (biomeIndex === BiomeType.SWAMP) {
    heightOffset += 2;
  } else if (biomeIndex === BiomeType.BADLANDS) {
    heightOffset -= mountainHeight * 15;
  }

  const terrainY = Math.floor(WORLD_HEIGHT / 2 + heightOffset);
  let topBlock = BlockType.GRASS;
  let subBlock = BlockType.DIRT;

  if (biomeIndex === BiomeType.DESERT) {
    topBlock = BlockType.SAND;
    subBlock = BlockType.SAND;
  } else if (biomeIndex === BiomeType.SNOW) {
    topBlock = BlockType.SNOW_GRASS;
    subBlock = BlockType.SNOW_DIRT;
  } else if (biomeIndex === BiomeType.OCEAN) {
    topBlock = BlockType.SAND;
    subBlock = BlockType.SAND;
  } else if (biomeIndex === BiomeType.MOUNTAIN) {
    topBlock = BlockType.STONE;
    subBlock = BlockType.STONE;
  } else if (biomeIndex === BiomeType.SNOWY_MOUNTAIN) {
    topBlock = BlockType.SNOW_GRASS;
    subBlock = BlockType.STONE;
  } else if (biomeIndex === BiomeType.VOLCANO) {
    topBlock = BlockType.OBSIDIAN;
    subBlock = BlockType.STONE;
  } else if (biomeIndex === BiomeType.SWAMP) {
    topBlock = BlockType.MUD;
    subBlock = BlockType.DIRT;
  } else if (biomeIndex === BiomeType.JUNGLE) {
    topBlock = BlockType.GRASS;
    subBlock = BlockType.DIRT;
  } else if (biomeIndex === BiomeType.BADLANDS) {
    topBlock = BlockType.RED_SAND;
    subBlock = BlockType.TERRACOTTA;
  }

  let actualSurfaceY = terrainY;
  if (biomeIndex === BiomeType.OCEAN) {
    actualSurfaceY += 8;
  } else if (biomeIndex === BiomeType.SWAMP) {
    actualSurfaceY += 1;
  }

  if (x >= 89000) {
    topBlock = BlockType.COCOA_FUR;
    subBlock = BlockType.DIRT;
    actualSurfaceY = WORLD_WATER_LEVEL;
  }

  return {
    biomeIndex,
    biomePos,
    actualSurfaceY,
    topBlock,
    subBlock,
  };
};

const getTreeChance = (biomeIndex: BiomeType) => {
  if (biomeIndex === BiomeType.FOREST) return 0.08;
  if (biomeIndex === BiomeType.SNOW || biomeIndex === BiomeType.SNOWY_MOUNTAIN) return 0.03;
  if (biomeIndex === BiomeType.DESERT) return 0.01;
  if (biomeIndex === BiomeType.OCEAN) return 0.02;
  if (biomeIndex === BiomeType.MOUNTAIN) return 0.04;
  if (biomeIndex === BiomeType.SWAMP) return 0.06;
  if (biomeIndex === BiomeType.JUNGLE) return 0.15;
  return 0;
};

const isNearPortal = (x: number) => PORTAL_COLUMNS.some(portalX => Math.abs(x - portalX) <= 5);

const fillBaseTerrain = (column: BlockType[], x: number) => {
  const base = getColumnBaseData(x);

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    if (
      x < 89000 &&
      ((base.biomeIndex === BiomeType.OCEAN && y >= WORLD_WATER_LEVEL && y < base.actualSurfaceY) ||
        (base.biomeIndex === BiomeType.SWAMP && y >= WORLD_WATER_LEVEL + 2 && y < base.actualSurfaceY))
    ) {
      column[y] = BlockType.WATER;
    } else if (y === base.actualSurfaceY) {
      if (base.biomeIndex === BiomeType.VOLCANO && base.biomePos > 0.45 && base.biomePos < 0.55) {
        column[y] = BlockType.MAGMA;
      } else {
        column[y] = base.topBlock;
      }
    } else if (y > base.actualSurfaceY && y < base.actualSurfaceY + 4) {
      if (base.biomeIndex === BiomeType.VOLCANO && base.biomePos > 0.4 && base.biomePos < 0.6) {
        column[y] = BlockType.MAGMA;
      } else {
        column[y] = base.subBlock;
      }
    } else if (y >= base.actualSurfaceY + 4) {
      const depth = y - (base.actualSurfaceY + 4);
      const oreRoll = rand01(x, y, ORE_SALT);
      column[y] = BlockType.STONE;
      if (base.biomeIndex === BiomeType.VOLCANO && base.biomePos > 0.45 && base.biomePos < 0.55) {
        column[y] = BlockType.MAGMA;
      } else if (depth > 20 && oreRoll < 0.005) {
        column[y] = BlockType.DIAMOND_ORE;
      } else if (depth > 10 && oreRoll < 0.015) {
        column[y] = BlockType.GOLD_ORE;
      } else if (depth > 5 && oreRoll < 0.03) {
        column[y] = BlockType.IRON_ORE;
      } else if (oreRoll < 0.05) {
        column[y] = BlockType.COAL_ORE;
      }
    }
  }
};

const applyPortalToColumn = (column: BlockType[], x: number) => {
  for (const portalX of PORTAL_COLUMNS) {
    if (x < portalX - 1 || x > portalX + 2) continue;
    const portalY = getColumnBaseData(portalX).actualSurfaceY - 1;
    for (let py = portalY - 5; py <= portalY; py++) {
      if (py < 0 || py >= WORLD_HEIGHT) continue;
      if (x === portalX - 1 || x === portalX + 2 || py === portalY || py === portalY - 5) {
        column[py] = BlockType.COCOA_FUR;
      } else {
        column[py] = BlockType.COCOA_PORTAL;
      }
    }
  }
};

const applyTreeToColumn = (
  column: BlockType[],
  x: number,
  rootX: number,
  kind: 'oak' | 'pine' | 'palm' | 'jungle',
  surfaceY: number,
  height: number,
) => {
  const maybeSet = (targetX: number, targetY: number, block: BlockType) => {
    if (targetX === x) {
      setColumnBlock(column, targetY, block);
    }
  };

  if (kind === 'oak') {
    const trunk = getBiome(rootX) === BiomeType.SWAMP ? BlockType.JUNGLE_WOOD : BlockType.WOOD;
    const leaf = getBiome(rootX) === BiomeType.SWAMP ? BlockType.JUNGLE_LEAVES : BlockType.LEAVES;
    for (let i = 1; i <= height; i++) {
      maybeSet(rootX, surfaceY - i, trunk);
    }
    const topY = surfaceY - height;
    maybeSet(rootX, topY, leaf);
    maybeSet(rootX - 1, topY, leaf);
    maybeSet(rootX + 1, topY, leaf);
    maybeSet(rootX, topY - 1, leaf);
    maybeSet(rootX - 1, topY + 1, leaf);
    maybeSet(rootX + 1, topY + 1, leaf);
    return;
  }

  if (kind === 'pine') {
    for (let i = 1; i <= height; i++) {
      maybeSet(rootX, surfaceY - i, BlockType.PINE_WOOD);
    }
    const topY = surfaceY - height;
    maybeSet(rootX, topY, BlockType.PINE_LEAVES);
    maybeSet(rootX, topY - 1, BlockType.PINE_LEAVES);
    maybeSet(rootX - 1, topY + 1, BlockType.PINE_LEAVES);
    maybeSet(rootX + 1, topY + 1, BlockType.PINE_LEAVES);
    maybeSet(rootX - 1, topY + 2, BlockType.PINE_LEAVES);
    maybeSet(rootX + 1, topY + 2, BlockType.PINE_LEAVES);
    maybeSet(rootX - 2, topY + 2, BlockType.PINE_LEAVES);
    maybeSet(rootX + 2, topY + 2, BlockType.PINE_LEAVES);
    return;
  }

  if (kind === 'palm') {
    for (let i = 1; i <= height; i++) {
      maybeSet(rootX + (i > 3 ? 1 : 0), surfaceY - i, BlockType.PALM_WOOD);
    }
    const topX = rootX + (height > 3 ? 1 : 0);
    const topY = surfaceY - height;
    maybeSet(topX, topY, BlockType.PALM_LEAVES);
    maybeSet(topX - 1, topY, BlockType.PALM_LEAVES);
    maybeSet(topX + 1, topY, BlockType.PALM_LEAVES);
    maybeSet(topX - 2, topY + 1, BlockType.PALM_LEAVES);
    maybeSet(topX + 2, topY + 1, BlockType.PALM_LEAVES);
    maybeSet(topX, topY - 1, BlockType.PALM_LEAVES);
    return;
  }

  for (let i = 1; i <= height; i++) {
    maybeSet(rootX, surfaceY - i, BlockType.JUNGLE_WOOD);
  }
  const topY = surfaceY - height;
  maybeSet(rootX, topY, BlockType.JUNGLE_LEAVES);
  maybeSet(rootX - 1, topY, BlockType.JUNGLE_LEAVES);
  maybeSet(rootX + 1, topY, BlockType.JUNGLE_LEAVES);
  maybeSet(rootX - 2, topY + 1, BlockType.JUNGLE_LEAVES);
  maybeSet(rootX + 2, topY + 1, BlockType.JUNGLE_LEAVES);
  maybeSet(rootX - 1, topY + 1, BlockType.JUNGLE_LEAVES);
  maybeSet(rootX + 1, topY + 1, BlockType.JUNGLE_LEAVES);
  maybeSet(rootX, topY - 1, BlockType.JUNGLE_LEAVES);
  maybeSet(rootX, topY - 2, BlockType.JUNGLE_LEAVES);
};

const applySurfaceFeatureFromRoot = (column: BlockType[], x: number, rootX: number) => {
  if (rootX < 0 || rootX >= WORLD_WIDTH) return;

  const base = getColumnBaseData(rootX);
  const surfaceY = getSurfaceY(rootX);
  const treeChance = getTreeChance(base.biomeIndex);
  const canPlaceTree =
    rootX < 89000 &&
    treeChance > 0 &&
    !isNearPortal(rootX) &&
    base.topBlock !== BlockType.WATER &&
    rootX > 2 &&
    rootX < WORLD_WIDTH - 3;

  if (canPlaceTree && rand01(rootX, 0, TREE_SALT) < treeChance) {
    if (
      base.biomeIndex === BiomeType.FOREST ||
      base.biomeIndex === BiomeType.MOUNTAIN ||
      base.biomeIndex === BiomeType.SWAMP
    ) {
      applyTreeToColumn(
        column,
        x,
        rootX,
        'oak',
        base.actualSurfaceY,
        3 + Math.floor(rand01(rootX, 0, TREE_HEIGHT_SALT) * 3),
      );
      return;
    }
    if (base.biomeIndex === BiomeType.SNOW || base.biomeIndex === BiomeType.SNOWY_MOUNTAIN) {
      applyTreeToColumn(
        column,
        x,
        rootX,
        'pine',
        base.actualSurfaceY,
        4 + Math.floor(rand01(rootX, 0, TREE_HEIGHT_SALT) * 4),
      );
      return;
    }
    if (base.biomeIndex === BiomeType.DESERT || base.biomeIndex === BiomeType.OCEAN) {
      applyTreeToColumn(
        column,
        x,
        rootX,
        'palm',
        base.actualSurfaceY,
        4 + Math.floor(rand01(rootX, 0, TREE_HEIGHT_SALT) * 3),
      );
      return;
    }
    if (base.biomeIndex === BiomeType.JUNGLE) {
      applyTreeToColumn(
        column,
        x,
        rootX,
        'jungle',
        base.actualSurfaceY,
        5 + Math.floor(rand01(rootX, 0, TREE_HEIGHT_SALT) * 5),
      );
      return;
    }
  }

  if ((base.biomeIndex === BiomeType.FOREST || base.biomeIndex === BiomeType.JUNGLE) && rootX === x) {
    const grassChance = base.biomeIndex === BiomeType.JUNGLE ? 0.2 : 0.05;
    if (rand01(rootX, 0, GRASS_SALT) < grassChance) {
      const block = rand01(rootX, 0, FLOWER_SALT) < 0.1 ? BlockType.FLOWER_BUD : BlockType.TALL_GRASS;
      setColumnBlock(column, surfaceY - 1, block);
    }
    return;
  }

  if (rootX !== x) return;

  if (
    (base.biomeIndex === BiomeType.DESERT || base.biomeIndex === BiomeType.BADLANDS) &&
    rand01(rootX, 0, CACTUS_SALT) < 0.05
  ) {
    const cactusHeight = 2 + Math.floor(rand01(rootX, 1, CACTUS_SALT) * 3);
    for (let i = 1; i <= cactusHeight; i++) {
      setColumnBlock(column, base.actualSurfaceY - i, BlockType.CACTUS);
    }
  } else if (base.biomeIndex === BiomeType.OCEAN && rand01(rootX, 0, CORAL_SALT) < 0.2) {
    setColumnBlock(column, base.actualSurfaceY - 1, BlockType.CORAL);
  }
};

const applyCastleToColumn = (column: BlockType[], x: number) => {
  if (x < CASTLE_START_X || x >= CASTLE_START_X + CASTLE_WIDTH) return;

  const isTower = x < CASTLE_START_X + 8 || x >= CASTLE_START_X + CASTLE_WIDTH - 8;
  const wallHeight = isTower ? CASTLE_HEIGHT : CASTLE_HEIGHT - 10;

  for (let cy = CASTLE_Y - CASTLE_HEIGHT - 1; cy <= CASTLE_Y; cy++) {
    if (cy <= CASTLE_Y - wallHeight - 1) continue;
    if (cy === CASTLE_Y - wallHeight - 1) {
      if (x % 2 === 0) {
        column[cy] = BlockType.OBSIDIAN;
      }
    } else if (
      x === CASTLE_START_X ||
      x === CASTLE_START_X + CASTLE_WIDTH - 1 ||
      x === CASTLE_START_X + 7 ||
      x === CASTLE_START_X + CASTLE_WIDTH - 8
    ) {
      column[cy] = BlockType.OBSIDIAN;
    } else if (cy === CASTLE_Y || cy === CASTLE_Y - wallHeight) {
      column[cy] = BlockType.OBSIDIAN;
    } else {
      column[cy] = BlockType.AIR;
    }
  }

  if (
    x === CASTLE_START_X ||
    x === CASTLE_START_X + 7 ||
    x === CASTLE_START_X + CASTLE_WIDTH - 8 ||
    x === CASTLE_START_X + CASTLE_WIDTH - 1
  ) {
    for (let cy = CASTLE_Y - 6; cy <= CASTLE_Y; cy++) {
      column[cy] = BlockType.AIR;
    }
  }

  if (x > CASTLE_START_X + 7 && x < CASTLE_START_X + CASTLE_WIDTH - 8) {
    column[CASTLE_Y - 1] = BlockType.TERRACOTTA;
  }

  if (x >= THRONE_CENTER_X - 3 && x <= THRONE_CENTER_X + 3) {
    column[CASTLE_Y - 1] = BlockType.GOLD_BLOCK;
  }
  if (x >= THRONE_CENTER_X - 2 && x <= THRONE_CENTER_X + 2) {
    column[CASTLE_Y - 2] = BlockType.GOLD_BLOCK;
  }
  if (x >= THRONE_CENTER_X - 1 && x <= THRONE_CENTER_X + 1) {
    column[CASTLE_Y - 3] = BlockType.DIAMOND_BLOCK;
  }

  if (x === THRONE_CENTER_X - 1 || x === THRONE_CENTER_X + 1) {
    column[CASTLE_Y - 4] = BlockType.GOLD_BLOCK;
    column[CASTLE_Y - 5] = BlockType.GOLD_BLOCK;
  }
  if (x === THRONE_CENTER_X) {
    column[CASTLE_Y - 4] = BlockType.DIAMOND_BLOCK;
    column[CASTLE_Y - 5] = BlockType.DIAMOND_BLOCK;
    column[CASTLE_Y - 6] = BlockType.GOLD_BLOCK;
  }
};

export const generateBaseColumnSync = (x: number): BlockType[] => {
  const column = Array(WORLD_HEIGHT).fill(BlockType.AIR);
  fillBaseTerrain(column, x);
  applyPortalToColumn(column, x);

  for (let rootX = x - 3; rootX <= x + 2; rootX++) {
    applySurfaceFeatureFromRoot(column, x, rootX);
  }

  applyCastleToColumn(column, x);
  return column;
};
