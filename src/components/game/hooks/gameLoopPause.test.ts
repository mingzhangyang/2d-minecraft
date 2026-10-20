import { describe, expect, it } from 'vitest';
import { releaseHeldGameInput, shouldAdvanceGame } from './gameLoopPause';

describe('game loop orientation pause', () => {
  it('does not advance while the portrait gate is open, including in slow motion', () => {
    for (const frame of [1, 4, 120]) {
      expect(shouldAdvanceGame(true, false, frame)).toBe(false);
      expect(shouldAdvanceGame(true, true, frame)).toBe(false);
    }
  });

  it('preserves normal and slow-motion tick cadence after unpausing', () => {
    expect(shouldAdvanceGame(false, false, 1)).toBe(true);
    expect(shouldAdvanceGame(false, true, 1)).toBe(false);
    expect(shouldAdvanceGame(false, true, 4)).toBe(true);
  });

  it('clears keyboard, placement, and mining buttons without changing pointer position', () => {
    const state = {
      keys: { KeyD: true, Space: true, KeyG: true, KeyA: false },
      mouse: { x: 120, y: 80, leftDown: true, rightDown: true },
    };

    releaseHeldGameInput(state);

    expect(state.keys).toEqual({ KeyD: false, Space: false, KeyG: false, KeyA: false });
    expect(state.mouse).toEqual({ x: 120, y: 80, leftDown: false, rightDown: false });

    // Repeated gate signals must be harmless.
    releaseHeldGameInput(state);
    expect(state.mouse.leftDown).toBe(false);
  });
});
