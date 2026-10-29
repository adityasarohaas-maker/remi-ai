import { describe, it, expect } from 'vitest';
import { groupIntoChapters, CHAPTER_TITLES } from '@/core/chapters';
import type { Memory } from '@/core/types';

const mem = (over: Partial<Memory>): Memory => ({
  id: 'm', householdId: 'h1', title: 't', summary: 's', quote: 'q', language: 'en', translation: null,
  recordingId: null, clipStartMs: null, clipEndMs: null, lifeStage: 'other', yearFrom: null, yearTo: null,
  people: [], places: [], kind: 'story', confidence: 'sure', verifiedBy: null,
  visibility: 'everyone', visibleTo: [], openOn: null, openEventId: null, recipientName: null, recipientEmail: null, openedAt: null,
  questionId: null, photoId: null, createdAt: '2026-10-01T00:00:00Z', ...over,
});

describe('groupIntoChapters', () => {
  it('orders chapters through her life and drops empty ones', () => {
    const out = groupIntoChapters([mem({ id: 'a', lifeStage: 'work' }), mem({ id: 'b', lifeStage: 'childhood' })]);
    expect(out.map((c) => c.stage)).toEqual(['childhood', 'work']);
    expect(out[0].title).toBe(CHAPTER_TITLES.childhood);
  });
  it('orders stories within a chapter by year, unknown years last, then by when they were told', () => {
    const out = groupIntoChapters([
      mem({ id: 'late', lifeStage: 'youth', yearFrom: 1965 }),
      mem({ id: 'none2', lifeStage: 'youth', yearFrom: null, createdAt: '2026-10-05T00:00:00Z' }),
      mem({ id: 'none1', lifeStage: 'youth', yearFrom: null, createdAt: '2026-10-02T00:00:00Z' }),
      mem({ id: 'early', lifeStage: 'youth', yearFrom: 1960 }),
    ]);
    expect(out[0].memories.map((m) => m.id)).toEqual(['early', 'late', 'none1', 'none2']);
  });
  it('keeps wishes as the last chapter', () => {
    const out = groupIntoChapters([mem({ id: 'w', lifeStage: 'wishes' }), mem({ id: 'o', lifeStage: 'other' }), mem({ id: 'l', lifeStage: 'later' })]);
    expect(out.map((c) => c.stage)).toEqual(['later', 'other', 'wishes']);
  });
});
