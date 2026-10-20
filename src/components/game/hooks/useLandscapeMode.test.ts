import { describe, expect, it, vi } from 'vitest';
import { lockLandscapeInFullscreen } from './useLandscapeMode';

describe('lockLandscapeInFullscreen', () => {
  it('enters fullscreen before requesting landscape', async () => {
    const order: string[] = [];
    const host = { requestFullscreen: vi.fn(async () => { order.push('fullscreen'); }) };
    const orientation = { lock: vi.fn(async () => { order.push('landscape'); }) };

    const result = await lockLandscapeInFullscreen(host, { fullscreenElement: null }, orientation);

    expect(result).toBe('locked');
    expect(order).toEqual(['fullscreen', 'landscape']);
    expect(orientation.lock).toHaveBeenCalledWith('landscape');
  });

  it('does not request fullscreen again when already in fullscreen', async () => {
    const host = { requestFullscreen: vi.fn(async () => {}) };
    const orientation = { lock: vi.fn(async () => {}) };

    const result = await lockLandscapeInFullscreen(
      host,
      { fullscreenElement: {} as Element },
      orientation,
    );

    expect(result).toBe('locked');
    expect(host.requestFullscreen).not.toHaveBeenCalled();
  });

  it('reports unavailable orientation and fullscreen APIs', async () => {
    const doc = { fullscreenElement: null };
    expect(await lockLandscapeInFullscreen({}, doc, {})).toBe('unavailable');
    expect(await lockLandscapeInFullscreen({}, doc, { lock: async () => {} })).toBe('unavailable');
  });

  it('falls back when fullscreen is denied', async () => {
    const orientation = { lock: vi.fn(async () => {}) };
    const result = await lockLandscapeInFullscreen(
      { requestFullscreen: async () => { throw new Error('gesture required'); } },
      { fullscreenElement: null },
      orientation,
    );

    expect(result).toBe('rejected');
    expect(orientation.lock).not.toHaveBeenCalled();
  });

  it('falls back when the browser rejects orientation lock', async () => {
    const result = await lockLandscapeInFullscreen(
      { requestFullscreen: async () => {} },
      { fullscreenElement: null },
      { lock: async () => { throw new Error('not supported'); } },
    );

    expect(result).toBe('rejected');
  });
});
