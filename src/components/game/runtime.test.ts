import { describe, expect, it } from 'vitest';
import { createInitialPlayer } from './runtime';
import { BlockType } from './types';
import { MAX_DURABILITY } from './constants';

describe('createInitialPlayer – cocoa starter loadout', () => {
  it('starts with the full Cocoa tool set and full durability', () => {
    const player = createInitialPlayer();
    const cocoaTools = [
      BlockType.COCOA_SWORD,
      BlockType.COCOA_AXE,
      BlockType.COCOA_HAMMER,
      BlockType.COCOA_PICKAXE,
      BlockType.COCOA_SPEAR,
    ];

    for (const tool of cocoaTools) {
      expect(player.inventory[tool]).toBe(1);
      expect(player.durability[tool]).toBe(MAX_DURABILITY[tool]);
    }
  });
});
