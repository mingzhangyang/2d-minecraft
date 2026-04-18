import { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { AnimalType, BlockType } from '../types';
import type { UpdateRect } from './updateContext';

type World = { [x: number]: { [y: number]: BlockType } };

/** Returns true if `block` passes through without physical collision. */
export const isNonCollidingBlockType = (block: BlockType): boolean => {
  switch (block) {
    case BlockType.AIR:
    case BlockType.TALL_GRASS:
    case BlockType.FLOWER_BUD:
    case BlockType.FLOWER_BLOOM:
    case BlockType.WATER:
    case BlockType.CACTUS:
    case BlockType.MAGMA:
    case BlockType.COCOA_PORTAL:
      return true;
    default:
      return false;
  }
};

/**
 * Returns true if `rect` overlaps any solid block in `world`.
 *
 * Out-of-bounds tiles are treated as solid (colliding), so entities cannot
 * escape the world boundary.
 *
 * Tiger snakes pass through DIRT and GRASS tiles (burrowing behaviour).
 */
export const checkCollisionAgainstWorld = (
  rect: UpdateRect,
  world: World,
  animalType?: AnimalType,
): boolean => {
  const startX = Math.floor(rect.x / TILE_SIZE);
  const endX   = Math.floor((rect.x + rect.width)  / TILE_SIZE);
  const startY = Math.floor(rect.y / TILE_SIZE);
  const endY   = Math.floor((rect.y + rect.height) / TILE_SIZE);

  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
        const block = world[x][y];
        if (!isNonCollidingBlockType(block)) {
          if (
            animalType === AnimalType.TIGER_SNAKE &&
            (block === BlockType.DIRT || block === BlockType.GRASS)
          ) {
            continue;
          }
          return true;
        }
      } else {
        return true; // out of world bounds → solid boundary
      }
    }
  }
  return false;
};
