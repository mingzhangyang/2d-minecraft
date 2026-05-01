import { describe, expect, it } from 'vitest';
import { createInitialPlayer } from './runtime';
import { COCOA_TOOL_BLOCKS, MAX_DURABILITY } from './constants';

describe('createInitialPlayer – cocoa starter loadout', () => {
  it('starts with the full Cocoa tool set without durability', () => {
    const player = createInitialPlayer();

    for (const tool of COCOA_TOOL_BLOCKS) {
      expect(player.inventory[tool]).toBe(1);
      expect(MAX_DURABILITY[tool]).toBeUndefined();
      expect(player.durability[tool]).toBeUndefined();
    }
  });
});
