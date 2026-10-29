import { describe, it, expect } from 'vitest';
import { DEMO_HOUSEHOLD_ID, isDemoHousehold } from '@/core/demo';

describe('isDemoHousehold (final review C2)', () => {
  it('recognises only the shared demo household', () => {
    expect(isDemoHousehold(DEMO_HOUSEHOLD_ID)).toBe(true);
    expect(isDemoHousehold('11111111-1111-4111-8111-111111111111')).toBe(false);
  });
});

describe('demoStableId', () => {
  it('makes a real uuid for every clip and photo the seed names', async () => {
    const { demoStableId } = await import('@/core/demo');
    const { isUuid } = await import('@/core/recording');
    for (const n of [0, 7, 29, 99]) {
      expect(isUuid(demoStableId(n, 'c'))).toBe(true);
      expect(isUuid(demoStableId(n, 'p'))).toBe(true);
    }
    expect(demoStableId(3, 'c')).not.toBe(demoStableId(3, 'p'));
  });
});
