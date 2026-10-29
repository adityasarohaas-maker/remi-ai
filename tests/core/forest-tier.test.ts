import { describe, it, expect } from 'vitest';
import { pickTier, TIER_BUDGET } from '@/core/forest-tier';

describe('forest tier', () => {
  it('uses the low tier on phones, small machines, or when unknown-but-small', () => {
    expect(pickTier({ cores: 12, memoryGB: 16, viewportWidth: 1440 })).toBe('high');
    expect(pickTier({ cores: 4, memoryGB: 16, viewportWidth: 1440 })).toBe('low');
    expect(pickTier({ cores: 12, memoryGB: 2, viewportWidth: 1440 })).toBe('low');
    expect(pickTier({ cores: 12, memoryGB: 16, viewportWidth: 390 })).toBe('low');
    expect(pickTier({ viewportWidth: 1440 })).toBe('high');
  });
  it('keeps the low tier under the budget', () => {
    const b = TIER_BUDGET.low; expect(b.kodi + b.grass + b.fireflies + b.leaves + b.stars + b.trees * 6000).toBeLessThan(80000);
  });
});
