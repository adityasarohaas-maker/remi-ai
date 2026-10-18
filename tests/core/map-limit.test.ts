import { describe, it, expect } from 'vitest';
import { mapLimit } from '@/core/map-limit';

describe('mapLimit (final review I5)', () => {
  it('runs at most N at once and keeps result order', async () => {
    let active = 0; let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      active++; peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50, 60, 70]);
    expect(peak).toBe(3);
  });
});
