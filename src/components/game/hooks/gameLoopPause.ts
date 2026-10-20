import type { GameState } from '../runtime';

/** An orientation gate suspends simulation, not just its visual presentation. */
export function shouldAdvanceGame(isPaused: boolean, isSlowMo: boolean, frameCount: number): boolean {
  return !isPaused && (!isSlowMo || frameCount % 4 === 0);
}

/**
 * A key or mouse button can be released while the gate has focus. Clear all
 * held input when pausing so the previous gesture cannot resume on rotation.
 */
export function releaseHeldGameInput(state: Pick<GameState, 'keys' | 'mouse'>): void {
  for (const key of Object.keys(state.keys)) {
    state.keys[key] = false;
  }
  state.mouse.leftDown = false;
  state.mouse.rightDown = false;
}
