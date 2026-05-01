import { describe, expect, it } from 'vitest';
import {
  areDebugControlsEnabled,
  DEBUG_CONTROLS_STORAGE_KEY,
  isDebugShortcutModifier,
} from './debugShortcuts';

describe('debug shortcut gating', () => {
  it('does not enable debug controls by default', () => {
    expect(areDebugControlsEnabled('', null)).toBe(false);
  });

  it('enables debug controls from the query string', () => {
    expect(areDebugControlsEnabled('?debugControls', null)).toBe(true);
  });

  it('enables debug controls from localStorage opt-in', () => {
    expect(areDebugControlsEnabled('', '1')).toBe(true);
  });

  it('uses Alt+Shift without Ctrl or Meta as the debug shortcut modifier', () => {
    expect(
      isDebugShortcutModifier({
        altKey: true,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
      }),
    ).toBe(true);

    expect(
      isDebugShortcutModifier({
        altKey: false,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
      }),
    ).toBe(false);
  });

  it('exports the documented storage key', () => {
    expect(DEBUG_CONTROLS_STORAGE_KEY).toBe('blockbuilder_debug_controls');
  });
});
