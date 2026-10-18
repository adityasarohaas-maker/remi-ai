import { describe, it, expect, vi } from 'vitest';
import { handleTalk, MAX_INPUT } from '@/core/talk';
import type { CoreDeps } from '@/core/talk';
import type { HouseholdContext } from '@/core/types';

const ctx: HouseholdContext = {
  household: { id: 'h1', patientName: 'Kamla Devi', preferredName: 'Kamla', language: 'en-IN', timezone: 'Asia/Kolkata', about: null, homeAddress: null, primaryContactName: 'Priya', primaryContactPhone: null },
  people: [{ id: 'p2', name: 'Ramesh', relation: 'husband', notes: null, isDeceased: true }],
  routine: [], doneIds: [],
  guidance: [
    { id: 'g1', topic: 'Husband Ramesh', triggerWords: ['Ramesh'], approach: 'share_memory', familyScript: 'Ramesh loved your rajma.', callPersonName: null },
    { id: 'g2', topic: 'Her mother', triggerWords: ['mother'], approach: 'call_relative', familyScript: 'Priya will tell you about her.', callPersonName: 'Priya' },
  ],
};

function makeDeps(over: Partial<CoreDeps> = {}) {
  const logged: { type: string; payload: Record<string, unknown> }[] = [];
  const alerts: { reason: string; detail: string }[] = [];
  const chat = vi.fn(async () => 'It is Saturday.\nMOOD: calm');
  const deps: CoreDeps = {
    now: () => new Date('2026-10-17T07:40:00Z'),
    loadContext: async () => ctx,
    recentTurns: async () => [{ text: 'What day is it?', reply: 'It is Saturday.' }],
    takeRateToken: async () => true,
    chat,
    logEvent: async (_h, type, payload) => { logged.push({ type, payload }); },
    alert: async (_h, reason, detail) => { alerts.push({ reason, detail }); },
    faceGallery: async () => [],
    ...over,
  };
  return { deps, logged, alerts, chat };
}

describe('handleTalk', () => {
  it('replies, strips the mood line and logs the turn', async () => {
    const { deps, logged } = makeDeps();
    const r = await handleTalk(deps, { householdId: 'h1', text: 'What day is it?' });
    expect(r).toEqual({ status: 200, body: { reply: 'It is Saturday.', mood: 'calm', alerted: false } });
    expect(logged[0]).toMatchObject({ type: 'conversation', payload: { text: 'What day is it?', mood: 'calm', fallback: false } });
  });

  it('sends the last turns as history', async () => {
    const { deps, chat } = makeDeps();
    await handleTalk(deps, { householdId: 'h1', text: 'And what time?' });
    const messages = (chat.mock.calls[0] as unknown[])[0] as { role: string }[];
    expect(messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
  });

  it('rejects empty input', async () => {
    const { deps } = makeDeps();
    expect((await handleTalk(deps, { householdId: 'h1', text: '   ' })).status).toBe(400);
  });

  it('caps input length', async () => {
    const { deps, logged } = makeDeps();
    await handleTalk(deps, { householdId: 'h1', text: 'a'.repeat(MAX_INPUT + 100) });
    expect((logged[0].payload.text as string).length).toBe(MAX_INPUT);
  });

  it('rate limits per household with a calm reply, without calling the model', async () => {
    const { deps, chat } = makeDeps({ takeRateToken: async (_h, bucket) => bucket !== 'talk' });
    const r = await handleTalk(deps, { householdId: 'h1', text: 'hi' });
    expect(r.status).toBe(429);
    expect(r.body.reply).toMatch(/^I'm right here/);
    expect(chat).not.toHaveBeenCalled();
  });

  it('rate limits per client too (public demo token)', async () => {
    const { deps, chat } = makeDeps({ takeRateToken: async (_h, bucket) => !bucket.startsWith('talk-client:') });
    expect((await handleTalk(deps, { householdId: 'h1', text: 'hi', clientKey: '1.2.3.4' })).status).toBe(429);
    expect(chat).not.toHaveBeenCalled();
  });

  it('still alerts the family on safety words when rate-limited (final review I4)', async () => {
    const { deps, alerts } = makeDeps({ takeRateToken: async (_h, bucket) => bucket !== 'talk' });
    const r = await handleTalk(deps, { householdId: 'h1', text: 'I fell and it hurts' });
    expect(r.status).toBe(429);
    expect(alerts[0]?.reason).toBe('safety');
  });

  it('dedupes repeated safety alerts but still answers', async () => {
    const { deps, alerts } = makeDeps({ takeRateToken: async (_h, bucket) => bucket !== 'safety-alert' });
    const r = await handleTalk(deps, { householdId: 'h1', text: 'I fell down' });
    expect(r.status).toBe(200);
    expect(alerts).toEqual([]);
  });

  it('falls back calmly when Nebius fails', async () => {
    const { deps, logged } = makeDeps({ chat: async () => { throw new Error('503'); } });
    const r = await handleTalk(deps, { householdId: 'h1', text: 'Hello' });
    expect(r.status).toBe(200);
    expect(r.body.reply).toMatch(/^I'm right here/);
    expect(logged[0].payload.fallback).toBe(true);
  });

  it('falls back when the model returns only a mood line', async () => {
    const { deps } = makeDeps({ chat: async () => 'MOOD: calm' });
    expect((await handleTalk(deps, { householdId: 'h1', text: 'Hello' })).body.reply).toMatch(/^I'm right here/);
  });

  it('alerts the family on safety words', async () => {
    const { deps, alerts } = makeDeps();
    const r = await handleTalk(deps, { householdId: 'h1', text: 'I fell down' });
    expect(r.body.alerted).toBe(true);
    expect(alerts[0].reason).toBe('safety');
    expect(alerts[0].detail).toContain('I fell down');
  });

  it('puts the family script in the prompt for a painful question', async () => {
    const { deps, chat, logged } = makeDeps();
    await handleTalk(deps, { householdId: 'h1', text: 'Where is Ramesh?' });
    const messages = (chat.mock.calls[0] as unknown[])[0] as { content: string }[];
    expect(messages[0].content).toContain('Ramesh loved your rajma.');
    expect(logged[0].payload.sensitiveTopic).toBe('Husband Ramesh');
  });

  it('asks the chosen relative to call for call_relative guidance', async () => {
    const { deps, alerts } = makeDeps();
    await handleTalk(deps, { householdId: 'h1', text: 'I want my mother' });
    expect(alerts).toEqual([{ reason: 'call_request', detail: expect.stringContaining('Priya') }]);
  });
});
