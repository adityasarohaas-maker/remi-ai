import { describe, it, expect } from 'vitest';
import { canUndoPassed, UNDO_HOURS } from '@/core/passed';

const marked = '2026-10-29T10:00:00Z';
const h = (over: Partial<{ status: 'living' | 'passed'; passed_marked_at: string | null; is_demo: boolean }> = {}) =>
  ({ status: 'passed' as const, passed_marked_at: marked, is_demo: false, ...over });

describe('canUndoPassed', () => {
  it('allows a change of heart within a day when nothing has opened', () => {
    expect(UNDO_HOURS).toBe(24);
    expect(canUndoPassed(h(), false, new Date('2026-10-30T09:00:00Z'))).toBe(true);
  });
  it('refuses once a sealed memory has opened', () => {
    expect(canUndoPassed(h(), true, new Date('2026-10-30T09:00:00Z'))).toBe(false);
  });
  it('refuses after a day', () => {
    expect(canUndoPassed(h(), false, new Date('2026-10-30T11:00:00Z'))).toBe(false);
  });
  it('always allows it for the demo family', () => {
    expect(canUndoPassed(h({ is_demo: true }), true, new Date('2027-01-01T00:00:00Z'))).toBe(true);
  });
  it('is meaningless while she is living', () => {
    expect(canUndoPassed(h({ status: 'living', passed_marked_at: null }), false, new Date())).toBe(false);
  });
});
