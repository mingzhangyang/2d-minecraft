import { describe, expect, it } from 'vitest';
import { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { AnimalType, BlockType } from '../types';
import { checkCollisionAgainstWorld, isNonCollidingBlockType } from './collisionUtils';

// ---------------------------------------------------------------------------
// Minimal stub world – sparse 2-D array accessed as world[x][y].
// ---------------------------------------------------------------------------
const makeWorld = (overrides: Record<string, BlockType> = {}): Record<number, Record<number, BlockType>> => {
  return new Proxy({} as Record<number, Record<number, BlockType>>, {
    get(target, xKey) {
      const x = Number(xKey);
      if (!target[x]) {
        target[x] = new Proxy({} as Record<number, BlockType>, {
          get(col, yKey) {
            const y = Number(yKey);
            const key = `${x},${y}`;
            return overrides[key] ?? BlockType.AIR;
          },
        });
      }
      return target[x];
    },
  });
};

/** A 1×1-pixel rect sitting entirely inside a single tile at (tileX, tileY). */
const tileRect = (tileX: number, tileY: number) => ({
  x: tileX * TILE_SIZE + 1,
  y: tileY * TILE_SIZE + 1,
  width: TILE_SIZE - 2,
  height: TILE_SIZE - 2,
});

// ---------------------------------------------------------------------------
// isNonCollidingBlockType
// ---------------------------------------------------------------------------

describe('isNonCollidingBlockType', () => {
  it('treats AIR as non-colliding', () => {
    expect(isNonCollidingBlockType(BlockType.AIR)).toBe(true);
  });

  it('treats WATER as non-colliding', () => {
    expect(isNonCollidingBlockType(BlockType.WATER)).toBe(true);
  });

  it('treats TALL_GRASS as non-colliding', () => {
    expect(isNonCollidingBlockType(BlockType.TALL_GRASS)).toBe(true);
  });

  it('treats MAGMA as non-colliding', () => {
    expect(isNonCollidingBlockType(BlockType.MAGMA)).toBe(true);
  });

  it('treats DIRT as colliding', () => {
    expect(isNonCollidingBlockType(BlockType.DIRT)).toBe(false);
  });

  it('treats STONE as colliding', () => {
    expect(isNonCollidingBlockType(BlockType.STONE)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkCollisionAgainstWorld – solid blocks
// ---------------------------------------------------------------------------

describe('checkCollisionAgainstWorld – solid blocks', () => {
  it('returns true when rect overlaps a DIRT tile', () => {
    const world = makeWorld({ '5,5': BlockType.DIRT });
    expect(checkCollisionAgainstWorld(tileRect(5, 5), world)).toBe(true);
  });

  it('returns true when rect overlaps a STONE tile', () => {
    const world = makeWorld({ '10,20': BlockType.STONE });
    expect(checkCollisionAgainstWorld(tileRect(10, 20), world)).toBe(true);
  });

  it('returns false when rect overlaps only AIR tiles', () => {
    const world = makeWorld();
    expect(checkCollisionAgainstWorld(tileRect(3, 3), world)).toBe(false);
  });

  it('returns false when rect overlaps only WATER tiles', () => {
    const world = makeWorld({ '7,7': BlockType.WATER });
    expect(checkCollisionAgainstWorld(tileRect(7, 7), world)).toBe(false);
  });

  it('returns false when rect overlaps only TALL_GRASS tiles', () => {
    const world = makeWorld({ '2,2': BlockType.TALL_GRASS });
    expect(checkCollisionAgainstWorld(tileRect(2, 2), world)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkCollisionAgainstWorld – out-of-bounds
// ---------------------------------------------------------------------------

describe('checkCollisionAgainstWorld – world boundary', () => {
  it('returns true for a rect that extends beyond the left edge (x < 0)', () => {
    const world = makeWorld();
    expect(
      checkCollisionAgainstWorld({ x: -1, y: 10 * TILE_SIZE, width: 10, height: 10 }, world),
    ).toBe(true);
  });

  it('returns true for a rect that extends beyond the top edge (y < 0)', () => {
    const world = makeWorld();
    expect(
      checkCollisionAgainstWorld({ x: 10 * TILE_SIZE, y: -1, width: 10, height: 10 }, world),
    ).toBe(true);
  });

  it('returns true for a rect that extends past WORLD_WIDTH', () => {
    const world = makeWorld();
    const x = (WORLD_WIDTH - 1) * TILE_SIZE + TILE_SIZE - 1; // straddling the right edge
    expect(
      checkCollisionAgainstWorld({ x, y: 10 * TILE_SIZE, width: TILE_SIZE, height: 10 }, world),
    ).toBe(true);
  });

  it('returns true for a rect that extends past WORLD_HEIGHT', () => {
    const world = makeWorld();
    const y = (WORLD_HEIGHT - 1) * TILE_SIZE + TILE_SIZE - 1;
    expect(
      checkCollisionAgainstWorld({ x: 10 * TILE_SIZE, y, width: 10, height: TILE_SIZE }, world),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkCollisionAgainstWorld – tiger snake pass-through
// ---------------------------------------------------------------------------

describe('checkCollisionAgainstWorld – tiger snake pass-through', () => {
  it('returns false for a tiger snake overlapping only DIRT', () => {
    const world = makeWorld({ '5,5': BlockType.DIRT });
    expect(
      checkCollisionAgainstWorld(tileRect(5, 5), world, AnimalType.TIGER_SNAKE),
    ).toBe(false);
  });

  it('returns false for a tiger snake overlapping only GRASS', () => {
    const world = makeWorld({ '6,6': BlockType.GRASS });
    expect(
      checkCollisionAgainstWorld(tileRect(6, 6), world, AnimalType.TIGER_SNAKE),
    ).toBe(false);
  });

  it('returns true for a tiger snake overlapping STONE (not a pass-through block)', () => {
    const world = makeWorld({ '8,8': BlockType.STONE });
    expect(
      checkCollisionAgainstWorld(tileRect(8, 8), world, AnimalType.TIGER_SNAKE),
    ).toBe(true);
  });

  it('returns true for a normal animal overlapping DIRT', () => {
    const world = makeWorld({ '5,5': BlockType.DIRT });
    expect(checkCollisionAgainstWorld(tileRect(5, 5), world)).toBe(true);
  });
});
