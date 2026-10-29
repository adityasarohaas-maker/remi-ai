import { describe, it, expect } from 'vitest';
import { buildPersonaPrompt, pickPersonaMemories, PERSONA_MEMORY_LIMIT } from '@/core/persona-prompt';

const mem = (i: number, over: Partial<{ confidence: 'sure' | 'unsure'; verifiedBy: string | null; createdAt: string }> = {}) => ({
  id: `m${i}`, title: `Story ${i}`, quote: `My words ${i}`, year: 1960 + i, confidence: 'sure' as const, verifiedBy: null, createdAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`, ...over,
});

describe('buildPersonaPrompt', () => {
  it('speaks as her, from her own words, and never hides that it is an AI', () => {
    const p = buildPersonaPrompt({ name: 'Avni', about: 'Retired teacher from Jaipur.', memories: [mem(1), mem(2)], viewerName: 'Priya' });
    expect(p).toContain('Avni');
    expect(p).toContain('My words 1');
    expect(p).toContain('Priya');
    expect(p).toMatch(/If someone asks whether you are real/);
    expect(p).toMatch(/never (?:promise|make promises)/i);
  });
});

describe('pickPersonaMemories', () => {
  it('leaves out stories she was not sure of unless the family verified them', () => {
    const picked = pickPersonaMemories([mem(1, { confidence: 'unsure' }), mem(2, { confidence: 'unsure', verifiedBy: 'u1' }), mem(3)]);
    expect(picked.map((m) => m.id)).toEqual(['m3', 'm2']);
  });
  it('keeps at most the limit, verified first, newest first', () => {
    expect(PERSONA_MEMORY_LIMIT).toBe(120);
    const many = Array.from({ length: 200 }, (_, i) => mem(i));
    expect(pickPersonaMemories(many)).toHaveLength(120);
  });
});
