import { describe, it, expect } from 'vitest';
import { buildDigestMessages } from '@/core/digest-prompt';
import { summarizeDay } from '@/core/day-summary';

describe('buildDigestMessages', () => {
  it('grounds the model in facts and forbids diagnosis', () => {
    const facts = summarizeDay('2026-10-17', [], [], 'Asia/Kolkata');
    const m = buildDigestMessages('Avni', facts);
    expect(m[0].content).toContain('observations, not a diagnosis');
    expect(m[0].content).toContain('Only use the facts');
    expect(JSON.parse(m[1].content).day).toBe('2026-10-17');
  });
});
