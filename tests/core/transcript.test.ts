import { describe, it, expect } from 'vitest';
import { showableTurns } from '@/core/transcript';

const turn = (id: number, payload: Record<string, unknown> = {}) => ({ id, created_at: '2026-11-01T10:00:00Z', payload: { text: 't', reply: 'r', ...payload } });

describe('showableTurns', () => {
  it('holds back what Remi has not gone through yet: it may be a secret', () => {
    expect(showableTurns([turn(5), turn(6)], 5).map((t) => t.id)).toEqual([5]);
    expect(showableTurns([turn(1)], 0)).toEqual([]);
  });
  it('never shows a sealed turn', () => {
    expect(showableTurns([turn(1, { sealed: true }), turn(2)], 9).map((t) => t.id)).toEqual([2]);
  });
  it('holds back a turn the extraction skipped, since nobody read it for seals', () => {
    expect(showableTurns([turn(1, { fallback: true })], 9)).toEqual([]);
  });
});
