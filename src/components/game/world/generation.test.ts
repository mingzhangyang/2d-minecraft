import { describe, expect, it } from 'vitest';
import { WORLD_HEIGHT } from '../constants';
import { generateBaseColumnSync, getSurfaceY } from './generation';

describe('world generation determinism', () => {
  it('returns identical column data for repeated generation of the same x', () => {
    const sampleXs = [0, 37, 101, 512, 4096, 89995];

    for (const x of sampleXs) {
      const first = generateBaseColumnSync(x);
      const second = generateBaseColumnSync(x);

      expect(first).toEqual(second);
      expect(first).toHaveLength(WORLD_HEIGHT);
    }
  });

  it('is order independent across mixed column requests', () => {
    const x = 1337;
    const baseline = generateBaseColumnSync(x);

    generateBaseColumnSync(10);
    generateBaseColumnSync(2500);
    generateBaseColumnSync(7777);

    const afterOtherColumns = generateBaseColumnSync(x);
    expect(afterOtherColumns).toEqual(baseline);
  });

  it('returns stable surface heights for repeated calls', () => {
    const sampleXs = [0, 50, 99, 100, 250, 9999, 45000, 89999];

    for (const x of sampleXs) {
      const first = getSurfaceY(x);
      const second = getSurfaceY(x);
      expect(second).toBe(first);
    }
  });
});
