import { describe, expect, it } from 'vitest';
import { BlockType } from './types';
import { checkCrafting, getRequiredProgress } from './crafting';

// Helpers to build the 9-slot crafting grid
type Slot = { type: BlockType; count: number } | null;

const empty = (): Slot[] => Array(9).fill(null);

/** Place a pattern starting at (row, col) in a 3×3 grid. */
const place = (
  pattern: (BlockType | null)[][],
  rowOff = 0,
  colOff = 0,
): Slot[] => {
  const grid = empty();
  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < pattern[r].length; c++) {
      const block = pattern[r][c];
      if (block !== null) {
        grid[(rowOff + r) * 3 + (colOff + c)] = { type: block, count: 1 };
      }
    }
  }
  return grid;
};

// ---------------------------------------------------------------------------
// checkCrafting
// ---------------------------------------------------------------------------

describe('checkCrafting – empty grid', () => {
  it('returns null for an empty grid', () => {
    expect(checkCrafting(empty())).toBeNull();
  });
});

describe('checkCrafting – log → planks', () => {
  it('produces 4 planks from a single WOOD log', () => {
    expect(checkCrafting(place([[BlockType.WOOD]]))).toEqual({
      type: BlockType.PLANKS,
      count: 4,
    });
  });

  it('produces 4 planks from PINE_WOOD', () => {
    expect(checkCrafting(place([[BlockType.PINE_WOOD]]))).toEqual({
      type: BlockType.PLANKS,
      count: 4,
    });
  });

  it('produces 4 planks from PALM_WOOD', () => {
    expect(checkCrafting(place([[BlockType.PALM_WOOD]]))).toEqual({
      type: BlockType.PLANKS,
      count: 4,
    });
  });

  it('matches the log recipe anywhere in the grid (bottom-right corner)', () => {
    const grid = empty();
    grid[8] = { type: BlockType.WOOD, count: 1 }; // row 2, col 2
    expect(checkCrafting(grid)).toEqual({ type: BlockType.PLANKS, count: 4 });
  });
});

describe('checkCrafting – planks → sticks', () => {
  it('produces 4 sticks from two planks stacked vertically', () => {
    expect(
      checkCrafting(place([[BlockType.PLANKS], [BlockType.PLANKS]])),
    ).toEqual({ type: BlockType.STICK, count: 4 });
  });

  it('matches the sticks recipe offset to the right column', () => {
    const grid = empty();
    grid[1] = { type: BlockType.PLANKS, count: 1 };
    grid[4] = { type: BlockType.PLANKS, count: 1 };
    expect(checkCrafting(grid)).toEqual({ type: BlockType.STICK, count: 4 });
  });
});

describe('checkCrafting – weapons', () => {
  const P = BlockType.PLANKS;
  const S = BlockType.STICK;
  const F = BlockType.FANG;
  const C = BlockType.COCOA_FUR;

  it('crafts a WOODEN_SWORD from planks–planks–stick column', () => {
    expect(checkCrafting(place([[P], [P], [S]]))).toEqual({
      type: BlockType.WOODEN_SWORD,
      count: 1,
    });
  });

  it('crafts a FANG_LANCE from fang above stick', () => {
    expect(checkCrafting(place([[F], [S]]))).toEqual({
      type: BlockType.FANG_LANCE,
      count: 1,
    });
  });

  it('crafts a COCOA_SWORD from cocoa fur–cocoa fur–stick column', () => {
    expect(checkCrafting(place([[C], [C], [S]]))).toEqual({
      type: BlockType.COCOA_SWORD,
      count: 1,
    });
  });

  it('crafts a COCOA_SPEAR from cocoa fur above two sticks', () => {
    expect(checkCrafting(place([[C], [S], [S]]))).toEqual({
      type: BlockType.COCOA_SPEAR,
      count: 1,
    });
  });
});

describe('checkCrafting – cocoa tools', () => {
  const C = BlockType.COCOA_FUR;
  const S = BlockType.STICK;

  it('crafts a COCOA_AXE', () => {
    expect(checkCrafting(place([
      [C, C],
      [C, S],
      [null, S],
    ]))).toEqual({ type: BlockType.COCOA_AXE, count: 1 });
  });

  it('crafts a COCOA_HAMMER', () => {
    expect(checkCrafting(place([
      [C, C, C],
      [null, S, null],
      [S, S, S],
    ]))).toEqual({ type: BlockType.COCOA_HAMMER, count: 1 });
  });

  it('crafts a COCOA_PICKAXE', () => {
    expect(checkCrafting(place([
      [C, C, C],
      [null, S, null],
      [null, S, null],
    ]))).toEqual({ type: BlockType.COCOA_PICKAXE, count: 1 });
  });
});

describe('checkCrafting – pickaxes', () => {
  const S = BlockType.STICK;

  const pickaxeCases: [BlockType, BlockType][] = [
    [BlockType.PLANKS, BlockType.WOODEN_PICKAXE],
    [BlockType.STONE, BlockType.STONE_PICKAXE],
    [BlockType.IRON_INGOT, BlockType.IRON_PICKAXE],
    [BlockType.GOLD_INGOT, BlockType.GOLD_PICKAXE],
    [BlockType.DIAMOND, BlockType.DIAMOND_PICKAXE],
  ];

  it.each(pickaxeCases)(
    'crafts %s pickaxe from 3×%s + 2 sticks',
    (mat, result) => {
      const grid = place([
        [mat, mat, mat],
        [null, S, null],
        [null, S, null],
      ]);
      expect(checkCrafting(grid)).toEqual({ type: result, count: 1 });
    },
  );
});

describe('checkCrafting – blocks', () => {
  const St = BlockType.STONE;

  it('crafts 4 BRICKS from 2×2 stone', () => {
    expect(checkCrafting(place([[St, St], [St, St]]))).toEqual({
      type: BlockType.BRICKS,
      count: 4,
    });
  });

  it('crafts FURNACE from hollow 3×3 stone ring', () => {
    expect(
      checkCrafting(
        place([
          [St, St, St],
          [St, null, St],
          [St, St, St],
        ]),
      ),
    ).toEqual({ type: BlockType.FURNACE, count: 1 });
  });

  it('crafts GRASS from two DIRT vertically', () => {
    expect(
      checkCrafting(place([[BlockType.DIRT], [BlockType.DIRT]])),
    ).toEqual({ type: BlockType.GRASS, count: 1 });
  });
});

describe('checkCrafting – invalid patterns', () => {
  it('returns null for an unrecognised pattern', () => {
    const grid = empty();
    grid[0] = { type: BlockType.STONE, count: 1 };
    grid[1] = { type: BlockType.DIRT, count: 1 };
    expect(checkCrafting(grid)).toBeNull();
  });

  it('returns null for a partial furnace pattern (missing one stone)', () => {
    const St = BlockType.STONE;
    const grid = place([
      [St, St, St],
      [St, null, St],
      [St, St, null], // missing bottom-right
    ]);
    expect(checkCrafting(grid)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getRequiredProgress
// ---------------------------------------------------------------------------

describe('getRequiredProgress – flying mode', () => {
  it('returns progress 0 and canMine true when flying', () => {
    const result = getRequiredProgress(
      BlockType.OBSIDIAN,
      BlockType.DIAMOND_PICKAXE,
      true,
      true,
    );
    expect(result).toEqual({ requiredProgress: 0, canMine: true });
  });
});

describe('getRequiredProgress – decoration blocks', () => {
  it.each([BlockType.TALL_GRASS, BlockType.FLOWER_BUD, BlockType.FLOWER_BLOOM])(
    '%s requires only 2 progress (no tool)',
    (block) => {
      // hasItem = false → toolTier = 0 → no reduction applied, base stays at 2
      const { requiredProgress, canMine } = getRequiredProgress(
        block,
        BlockType.WOODEN_PICKAXE,
        false,
      );
      expect(canMine).toBe(true);
      expect(requiredProgress).toBe(2);
    },
  );
});

describe('getRequiredProgress – stone-tier blocks (need pickaxe)', () => {
  it('cannot mine STONE without a pickaxe', () => {
    expect(
      getRequiredProgress(BlockType.STONE, BlockType.DIRT, false).canMine,
    ).toBe(false);
  });

  it('can mine STONE with a wooden pickaxe', () => {
    const { canMine, requiredProgress } = getRequiredProgress(
      BlockType.STONE,
      BlockType.WOODEN_PICKAXE,
      true,
    );
    expect(canMine).toBe(true);
    // base 60 − tier 1 × 10 = 50
    expect(requiredProgress).toBe(50);
  });

  it('cannot mine IRON_ORE with a wooden pickaxe (need stone tier)', () => {
    expect(
      getRequiredProgress(BlockType.IRON_ORE, BlockType.WOODEN_PICKAXE, true)
        .canMine,
    ).toBe(false);
  });

  it('can mine IRON_ORE with a stone pickaxe', () => {
    const { canMine, requiredProgress } = getRequiredProgress(
      BlockType.IRON_ORE,
      BlockType.STONE_PICKAXE,
      true,
    );
    expect(canMine).toBe(true);
    // base 90 − tier 2 × 10 = 70
    expect(requiredProgress).toBe(70);
  });

  it('cannot mine GOLD_ORE with a stone pickaxe (need iron tier)', () => {
    expect(
      getRequiredProgress(BlockType.GOLD_ORE, BlockType.STONE_PICKAXE, true)
        .canMine,
    ).toBe(false);
  });

  it('cannot mine OBSIDIAN with an iron pickaxe (need diamond tier)', () => {
    expect(
      getRequiredProgress(BlockType.OBSIDIAN, BlockType.IRON_PICKAXE, true)
        .canMine,
    ).toBe(false);
  });

  it('can mine OBSIDIAN with a diamond pickaxe', () => {
    const { canMine, requiredProgress } = getRequiredProgress(
      BlockType.OBSIDIAN,
      BlockType.DIAMOND_PICKAXE,
      true,
    );
    expect(canMine).toBe(true);
    // base 300 − tier 5 × 10 = 250
    expect(requiredProgress).toBe(250);
  });

  it('cocoa pickaxe can mine anything instantly', () => {
    const result = getRequiredProgress(
      BlockType.OBSIDIAN,
      BlockType.COCOA_PICKAXE,
      true,
    );
    expect(result).toEqual({ requiredProgress: 0, canMine: true });
  });
});

describe('getRequiredProgress – tool bonus clamp', () => {
  it('never reduces progress below 5', () => {
    // LEAVES has base 5; even with a diamond pickaxe it stays at 5
    const { requiredProgress } = getRequiredProgress(
      BlockType.LEAVES,
      BlockType.DIAMOND_PICKAXE,
      true,
    );
    expect(requiredProgress).toBeGreaterThanOrEqual(5);
  });
});

describe('getRequiredProgress – no item equipped', () => {
  it('cannot mine STONE when hasItem is false', () => {
    expect(
      getRequiredProgress(BlockType.STONE, BlockType.WOODEN_PICKAXE, false)
        .canMine,
    ).toBe(false);
  });

  it('returns base progress for DIRT even without a tool', () => {
    const { requiredProgress, canMine } = getRequiredProgress(
      BlockType.DIRT,
      BlockType.WOODEN_PICKAXE,
      false,
    );
    expect(canMine).toBe(true);
    expect(requiredProgress).toBe(15);
  });
});

describe('getRequiredProgress – cocoa axe', () => {
  it('instant mines tree blocks', () => {
    const result = getRequiredProgress(
      BlockType.WOOD,
      BlockType.COCOA_AXE,
      true,
    );
    expect(result).toEqual({ requiredProgress: 0, canMine: true });
  });

  it('does not instant mine stone blocks', () => {
    const result = getRequiredProgress(
      BlockType.STONE,
      BlockType.COCOA_AXE,
      true,
    );
    expect(result.canMine).toBe(false);
    expect(result.requiredProgress).toBe(60);
  });
});
