import { describe, it, expect } from 'vitest';
import { buildExtractionPrompt, draftToRow, type MemoryDraft, type Turn } from '@/core/extract';

const turns: Turn[] = [
  { i: 0, text: 'My school was by the lake in Jaipur.', reply: 'Oh, by a lake!', mood: 'happy', recordingId: 'rec-0', photoId: null },
  { i: 1, text: 'I think it was 1958, or maybe 1960.', reply: 'That is a while ago.', mood: 'confused', recordingId: 'rec-1', photoId: null },
];
const draft = (over: Partial<MemoryDraft> = {}): MemoryDraft => ({
  title: 'School by the lake', summary: 'Her school stood by a lake in Jaipur.', quote: 'My school was by the lake in Jaipur.',
  language: 'en', translation: null, turnIndexes: [0], lifeStage: 'childhood', yearFrom: 1958, yearTo: null,
  people: [], places: ['Jaipur'], kind: 'story', unsure: false, unsureReason: null,
  visibility: 'everyone', forNames: [], openOn: null, openEventName: null, answersQuestionId: null, photoId: null, ...over,
});
const ctx = {
  householdId: 'h1', turns,
  members: [{ userId: 'u-priya', name: 'Priya' }],
  events: [{ id: 'ev-wed', name: "Riya's wedding" }],
  consentDefault: 'everyone' as const,
};

describe('draftToRow', () => {
  it('keeps a memory for a named family member to that member', () => {
    const row = draftToRow(draft({ forNames: ['Priya'] }), ctx);
    expect(row.visibility).toBe('members');
    expect(row.visible_to).toEqual(['u-priya']);
  });
  it('seals a letter for someone without an account until the day the family marks', () => {
    const row = draftToRow(draft({ forNames: ['Riya'], openEventName: "Riya's wedding", kind: 'letter' }), ctx);
    expect(row).toMatchObject({ visibility: 'on_event', open_event_id: 'ev-wed', recipient_name: 'Riya', kind: 'letter', visible_to: [] });
  });
  it('names a new event when the family has not written it yet', () => {
    const row = draftToRow(draft({ forNames: [], openEventName: "Arjun's graduation" }), ctx);
    expect(row).toMatchObject({ visibility: 'on_event', open_event_id: null, new_event_name: "Arjun's graduation" });
  });
  it('marks a story told while confused as unsure', () => {
    expect(draftToRow(draft({ turnIndexes: [1] }), ctx).confidence).toBe('unsure');
    expect(draftToRow(draft({ turnIndexes: [0] }), ctx).confidence).toBe('sure');
    expect(draftToRow(draft({ unsure: true }), ctx).confidence).toBe('unsure');
  });
  it('links the clip of the first turn the story came from', () => {
    expect(draftToRow(draft({ turnIndexes: [1, 0] }), ctx).recording_id).toBe('rec-1');
  });
  it('keeps her words in her language, untouched', () => {
    const hindi = 'मेरा स्कूल झील के किनारे था।';
    const row = draftToRow(draft({ quote: hindi, language: 'hi', translation: 'My school was by the lake.' }), ctx);
    expect(row.quote).toBe(hindi);
    expect(row.language).toBe('hi');
  });
  it('uses the household default when she said nothing about who may hear it', () => {
    expect(draftToRow(draft({ visibility: 'everyone' }), { ...ctx, consentDefault: 'after_death' }).visibility).toBe('after_death');
  });
});

describe('buildExtractionPrompt', () => {
  it('tells the model to copy her words exactly and lists the pending questions', () => {
    const msgs = buildExtractionPrompt({ preferredName: 'Avni', careType: 'dementia', turns, pendingQuestions: [{ id: 'q1', question: 'Ask about 1971' }], people: [], existingTitles: ['Rose garden'] });
    const text = msgs.map((m) => m.content).join('\n');
    expect(text).toMatch(/copy her words exactly/i);
    expect(text).toContain('q1');
    expect(text).toContain('Rose garden');
    expect(text).toContain('[0]');
  });
});

describe('sealedTurnIndexes', () => {
  it('names the turns whose words must leave the shared transcript', async () => {
    const { sealedTurnIndexes } = await import('@/core/extract');
    expect(sealedTurnIndexes([
      draft({ turnIndexes: [0], visibility: 'everyone' }),
      draft({ turnIndexes: [1, 2], visibility: 'remi_only' }),
      draft({ turnIndexes: [2, 3], visibility: 'members', forNames: ['Priya'] }),
      draft({ turnIndexes: [4], visibility: 'everyone', forNames: ['Priya'] }),
    ])).toEqual([1, 2, 3, 4]);
  });
});
