import { describe, it, expect } from 'vitest';
import { DEMO_HOUSEHOLD_ID, isDemoHousehold } from '@/core/demo';

describe('isDemoHousehold (final review C2)', () => {
  it('recognises only the shared demo household', () => {
    expect(isDemoHousehold(DEMO_HOUSEHOLD_ID)).toBe(true);
    expect(isDemoHousehold('11111111-1111-4111-8111-111111111111')).toBe(false);
  });
});
