import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/seeded';

describe('mulberry32', () => {
  it('is deterministic', () => { const a = mulberry32(7), b = mulberry32(7); expect([a(), a(), a()]).toEqual([b(), b(), b()]); });
  it('stays in [0, 1)', () => { const r = mulberry32(3); for (let i = 0; i < 1000; i++) { const x = r(); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); } });
});
