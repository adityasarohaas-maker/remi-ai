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

describe('evening note and the stories of the day', () => {
  it('tells the family which stories came up today', () => {
    const facts = summarizeDay('2026-10-17', [], [], 'Asia/Kolkata');
    const m = buildDigestMessages('Avni', facts, ['School by the lake', 'The rose garden']);
    expect(m[0].content).toContain('Today Avni told me about');
    expect(m[1].content).toContain('School by the lake');
    expect(buildDigestMessages('Avni', facts)[0].content).not.toContain('Today Avni told me about');
  });
});
