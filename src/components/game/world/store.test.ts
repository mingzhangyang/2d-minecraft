import { afterEach, describe, expect, it } from 'vitest';
import { BlockType } from '../types';
import {
  disposeWorldStreaming,
  evictWorldColumns,
  generateWorld,
  getDirtyWorldEdits,
} from './store';

const activeWorlds: ReturnType<typeof generateWorld>[] = [];

afterEach(() => {
  for (const world of activeWorlds) {
    disposeWorldStreaming(world);
  }
  activeWorlds.length = 0;
});

describe('world store edit tracking', () => {
  it('tracks and clears edits based on base block values', () => {
    const world = generateWorld();
    activeWorlds.push(world);

    const x = 256;
    const y = 20;
    const base = world[x][y];
    const changed = base === BlockType.AIR ? BlockType.DIRT : BlockType.AIR;

    world[x][y] = changed;
    expect(getDirtyWorldEdits(world)).toContainEqual([x, y, changed]);

    world[x][y] = base;
    expect(getDirtyWorldEdits(world)).toEqual([]);
  });
});

describe('world store eviction behavior', () => {
  it('preserves dirty edits across eviction and regeneration', () => {
    const world = generateWorld();
    activeWorlds.push(world);

    const x = 700;
    const y = 12;
    const original = world[x][y];
    const changed = original === BlockType.AIR ? BlockType.DIRT : BlockType.AIR;

    world[x][y] = changed;
    evictWorldColumns(world, 0, 120);

    expect(world[x][y]).toBe(changed);
    expect(getDirtyWorldEdits(world)).toContainEqual([x, y, changed]);
  });

  it('regenerates non-dirty columns deterministically after eviction', () => {
    const world = generateWorld();
    activeWorlds.push(world);

    const x = 480;
    const y = 18;
    const beforeEviction = world[x][y];

    evictWorldColumns(world, 0, 100);
    const afterEviction = world[x][y];

    expect(afterEviction).toBe(beforeEviction);
    expect(getDirtyWorldEdits(world)).toEqual([]);
  });
});
