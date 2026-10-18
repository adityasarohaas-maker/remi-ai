import { describe, it, expect, vi } from 'vitest';
import { handleIdentify } from '@/core/identify';
import { EMBEDDING_LENGTH } from '@/core/face-match';
import type { CoreDeps } from '@/core/talk';

const emb = (i: number) => Array.from({ length: EMBEDDING_LENGTH }, (_, k) => (k === i ? 1 : 0));

function deps(over: Partial<CoreDeps> = {}): CoreDeps {
  return {
    now: () => new Date('2026-10-17T07:40:00Z'),
    loadContext: async () => ({
      household: { id: 'h1', patientName: 'Kamla Devi', preferredName: 'Kamla', language: 'en-IN', timezone: 'Asia/Kolkata', about: null, homeAddress: null, primaryContactName: 'Priya', primaryContactPhone: null },
      people: [{ id: 'rohan', name: 'Rohan', relation: 'grandson', notes: 'Loves cricket', isDeceased: false }],
      routine: [], doneIds: [], guidance: [],
    }),
    recentTurns: async () => [],
    countRecentEvents: async () => 0,
    chat: vi.fn(async () => "That's Rohan, your grandson. Ask him about his cricket match!"),
    logEvent: vi.fn(async () => {}),
    alert: async () => {},
    faceGallery: async () => [{ personId: 'rohan', embedding: emb(0) }],
    ...over,
  };
}

describe('handleIdentify', () => {
  it('names a matched person warmly', async () => {
    const r = await handleIdentify(deps(), { householdId: 'h1', embedding: emb(0) });
    expect(r.body).toMatchObject({ status: 'match', name: 'Rohan', relation: 'grandson' });
    expect(r.body.reply).toContain('Rohan');
  });
  it('never guesses: unsure → fixed message, no LLM call', async () => {
    const d = deps();
    const r = await handleIdentify(d, { householdId: 'h1', embedding: emb(5) });
    expect(r.body).toEqual({ status: 'unsure', reply: "I'm not sure who this is. Shall I ask Priya?" });
    expect(d.chat).not.toHaveBeenCalled();
  });
  it('uses a plain sentence if Nebius fails', async () => {
    const r = await handleIdentify(deps({ chat: async () => { throw new Error('x'); } }), { householdId: 'h1', embedding: emb(0) });
    expect(r.body.reply).toBe('This is Rohan, your grandson.');
  });
  it('rejects bad embeddings', async () => {
    expect((await handleIdentify(deps(), { householdId: 'h1', embedding: [1, 2] })).status).toBe(400);
  });
  it('rate limits', async () => {
    expect((await handleIdentify(deps({ countRecentEvents: async () => 20 }), { householdId: 'h1', embedding: emb(0) })).status).toBe(429);
  });
});
