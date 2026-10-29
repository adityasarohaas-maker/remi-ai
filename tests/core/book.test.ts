import { describe, it, expect } from 'vitest';
import { bookMemories } from '@/core/book';
import type { Memory } from '@/core/types';

const mem = (over: Partial<Memory>): Memory => ({
  id: 'm', householdId: 'h1', title: 't', summary: 's', quote: 'q', language: 'en', translation: null,
  recordingId: null, clipStartMs: null, clipEndMs: null, lifeStage: 'childhood', yearFrom: null, yearTo: null,
  people: [], places: [], kind: 'story', confidence: 'sure', verifiedBy: null,
  visibility: 'everyone', visibleTo: [], openOn: null, openEventId: null, recipientName: null, recipientEmail: null, openedAt: null,
  questionId: null, photoId: null, createdAt: '2026-10-01T00:00:00Z', ...over,
});

describe('bookMemories', () => {
  it('prints what everyone may read, and opened letters, in chapters', () => {
    const chapters = bookMemories([
      mem({ id: 'everyone' }),
      mem({ id: 'opened-letter', visibility: 'after_death', kind: 'letter', openedAt: '2026-10-20T00:00:00Z', lifeStage: 'later' }),
      mem({ id: 'still-sealed', visibility: 'after_death' }),
      mem({ id: 'remi-only', visibility: 'remi_only' }),
      mem({ id: 'doubted', confidence: 'unsure' }),
      mem({ id: 'doubted-then-verified', confidence: 'unsure', verifiedBy: 'u1' }),
      mem({ id: 'for-priya', visibility: 'members', visibleTo: ['u1'] }),
    ]);
    const ids = chapters.flatMap((c) => c.memories.map((m) => m.id));
    expect(ids).toEqual(['everyone', 'doubted-then-verified', 'opened-letter']);
  });
});
