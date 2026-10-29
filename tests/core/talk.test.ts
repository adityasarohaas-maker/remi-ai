import { describe, it, expect, vi } from 'vitest';
import { handleTalk, MAX_INPUT } from '@/core/talk';
import type { CoreDeps } from '@/core/talk';
import type { HouseholdContext } from '@/core/types';

const ctx: HouseholdContext = {
  household: { id: 'h1', patientName: 'Avni Devi', preferredName: 'Avni', language: 'en-IN', timezone: 'Asia/Kolkata', about: null, homeAddress: null, primaryContactName: 'Priya', primaryContactPhone: null },
  people: [{ id: 'p2', name: 'Ramesh', relation: 'husband', notes: null, isDeceased: true }],
  routine: [], doneIds: [], careType: 'elderly', pendingQuestions: [], unshownPhoto: null,
  storyCoverage: { childhood: 0, youth: 0, marriage: 0, work: 0, parenthood: 0, later: 0, other: 0, wishes: 0 }, lastSteerAt: null,
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
    markQuestionAsked: async () => {},
    setRecordVoice: async () => {},
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

  it('keeps the mood line on earlier replies so the model keeps writing it', async () => {
    const { deps, chat } = makeDeps({ recentTurns: async () => [{ text: 'Hello', reply: 'Hello Avni.', mood: 'happy' }, { text: 'Hi', reply: 'Hi.', mood: 'unknown' }] });
    await handleTalk(deps, { householdId: 'h1', text: 'And what time?' });
    const messages = (chat.mock.calls[0] as unknown[])[0] as { role: string; content: string }[];
    expect(messages[2].content).toBe('Hello Avni.\nMOOD: happy');
    expect(messages[4].content).toBe('Hi.');
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
  it("says the family's own words when the model is down and guidance matches", async () => {
    const { deps, logged } = makeDeps({ chat: async () => { throw new Error('no key'); } });
    const r = await handleTalk(deps, { householdId: 'h1', text: 'Where is Ramesh?' });
    expect(r.body.reply).toBe('Ramesh loved your rajma.');
    expect(logged[0].payload).toMatchObject({ fallback: true, sensitiveTopic: 'Husband Ramesh' });
  });

  it('tells her the family knows when the model is down and safety words were heard', async () => {
    const { deps } = makeDeps({ chat: async () => { throw new Error('no key'); } });
    const r = await handleTalk(deps, { householdId: 'h1', text: 'I fell down' });
    expect(r.body.reply).toBe("I've told Priya. Someone will be in touch very soon.");
    expect(r.body.alerted).toBe(true);
  });
  describe('overheard speech', () => {
    const overheard = (text: string) => ({ householdId: 'h1', text, mode: 'overheard' as const });

    it('stays silent on ordinary chatter, without calling the model or saving it', async () => {
      const { deps, chat, logged } = makeDeps();
      const r = await handleTalk(deps, overheard('the tea is nice and hot'));
      expect(r.body.reply).toBeNull();
      expect(chat).not.toHaveBeenCalled();
      expect(logged).toEqual([]);
    });

    it('joins in on a question it can help with, and says it was overheard', async () => {
      const { deps, chat, logged } = makeDeps();
      const r = await handleTalk(deps, overheard('what day is it today'));
      expect(r.body.reply).toBe('It is Saturday.');
      const messages = (chat.mock.calls[0] as unknown[])[0] as { content: string }[];
      expect(messages[0].content).toContain('not to you');
      expect(messages[0].content).toContain('SKIP');
      expect(logged[0].payload).toMatchObject({ mode: 'overheard', text: 'what day is it today' });
    });

    it('stays silent when the model decides to skip', async () => {
      const { deps, logged } = makeDeps({ chat: async () => 'SKIP\nMOOD: calm' });
      expect((await handleTalk(deps, overheard('when is lunch'))).body.reply).toBeNull();
      expect(logged).toEqual([]);
    });

    it('joins in at most once per cooldown', async () => {
      const { deps, chat } = makeDeps({ takeRateToken: async (_h, bucket) => bucket !== 'join-in' });
      expect((await handleTalk(deps, overheard('what day is it today'))).body.reply).toBeNull();
      expect(chat).not.toHaveBeenCalled();
    });

    it('always acts on safety words', async () => {
      const { deps, alerts } = makeDeps({ takeRateToken: async (_h, bucket) => bucket !== 'join-in' });
      const r = await handleTalk(deps, overheard('I fell down'));
      expect(alerts[0].reason).toBe('safety');
      expect(r.body.reply).toBeTruthy();
    });

    it('answers the day from the clock when the model is down', async () => {
      const { deps } = makeDeps({ chat: async () => { throw new Error('no key'); } });
      expect((await handleTalk(deps, overheard('what day is it today'))).body.reply).toBe('Today is Saturday, 17 October 2026. It is 1:10 pm.');
    });

    it('stays silent when the model is down and there is nothing sure to say', async () => {
      const { deps } = makeDeps({ chat: async () => { throw new Error('no key'); } });
      expect((await handleTalk(deps, overheard('when is Priya coming'))).body.reply).toBeNull();
    });
  });

  it('answers the day from the clock when the model is down, in Hindi too', async () => {
    const { deps } = makeDeps({ chat: async () => { throw new Error('no key'); } });
    expect((await handleTalk(deps, { householdId: 'h1', text: 'What time is it?' })).body.reply).toBe('Today is Saturday, 17 October 2026. It is 1:10 pm.');
    const hi = makeDeps({
      chat: async () => { throw new Error('no key'); },
      loadContext: async () => ({ ...ctx, household: { ...ctx.household, language: 'hi-IN' } }),
    });
    expect((await handleTalk(hi.deps, { householdId: 'h1', text: 'आज क्या दिन है' })).body.reply).toBe('आज शनिवार है, 17 अक्टूबर 2026। अभी 1:10 pm बजे हैं।');
  });
  describe('speech just after Remi spoke', () => {
    const followup = (text: string) => ({ householdId: 'h1', text, mode: 'followup' as const });

    it('answers a reply without needing the wake word or a question', async () => {
      const { deps, chat } = makeDeps();
      const r = await handleTalk(deps, followup('yes please'));
      expect(r.body.reply).toBe('It is Saturday.');
      const messages = (chat.mock.calls[0] as unknown[])[0] as { content: string }[];
      expect(messages[0].content).toContain('may be a reply');
    });

    it('stays silent when the model says it was not for Remi', async () => {
      const { deps } = makeDeps({ chat: async () => 'SKIP' });
      expect((await handleTalk(deps, followup('the tea is nice and hot'))).body.reply).toBeNull();
    });

    it('stays silent without the model unless it is sure what to say', async () => {
      const { deps } = makeDeps({ chat: async () => { throw new Error('no key'); } });
      expect((await handleTalk(deps, followup('the tea is nice and hot'))).body.reply).toBeNull();
      expect((await handleTalk(deps, followup('what day is it'))).body.reply).toMatch(/^Today is Saturday/);
    });
  });
  it('answers in Hindi when she speaks Hindi, even in an English household', async () => {
    const { deps, chat } = makeDeps();
    await handleTalk(deps, { householdId: 'h1', text: 'मुझे रोहन की याद आ रही है' });
    const messages = (chat.mock.calls[0] as unknown[])[0] as { content: string }[];
    expect(messages[0].content).toContain('Usually reply in Hindi');
  });

  it('says the clock answer in Hindi without the model when she asks in Hindi', async () => {
    const { deps } = makeDeps({ chat: async () => { throw new Error('no key'); } });
    expect((await handleTalk(deps, { householdId: 'h1', text: 'आज क्या दिन है' })).body.reply).toMatch(/^आज शनिवार है/);
  });
  it('puts the reply language on her own message when she speaks Hindi', async () => {
    const { deps, chat } = makeDeps();
    await handleTalk(deps, { householdId: 'h1', text: 'मुझे रोहन की याद आ रही है' });
    const messages = (chat.mock.calls[0] as unknown[])[0] as { content: string }[];
    expect(messages.at(-1)!.content).toBe('मुझे रोहन की याद आ रही है\n\n(Reply in Hindi.)');
  });

  it('leaves her message alone in the household language', async () => {
    const { deps, chat } = makeDeps();
    await handleTalk(deps, { householdId: 'h1', text: 'Hello' });
    const messages = (chat.mock.calls[0] as unknown[])[0] as { content: string }[];
    expect(messages.at(-1)!.content).toBe('Hello');
  });
  describe('telling the family', () => {
    const replyWithMessage = 'I will let Priya know.\nTELL_FAMILY: Avni would like to talk to Rohan.\nMOOD: calm';

    it('sends the message to the family and keeps it out of what Remi says', async () => {
      const { deps, alerts, logged } = makeDeps({ chat: async () => replyWithMessage });
      const r = await handleTalk(deps, { householdId: 'h1', text: 'Yes, please tell her' });
      expect(r.body.reply).toBe('I will let Priya know.');
      expect(alerts).toContainEqual({ reason: 'message', detail: 'Avni would like to talk to Rohan.' });
      expect(logged[0].payload).toMatchObject({ toldFamily: 'Avni would like to talk to Rohan.' });
    });

    it('limits how often messages go out, but still answers', async () => {
      const { deps, alerts } = makeDeps({ chat: async () => replyWithMessage, takeRateToken: async (_h, b) => b !== 'tell-family' });
      const r = await handleTalk(deps, { householdId: 'h1', text: 'Yes, please tell her' });
      expect(r.body.reply).toBe('I will let Priya know.');
      expect(alerts).toEqual([]);
    });

    it('explains the TELL_FAMILY line in the prompt', async () => {
      const { deps, chat } = makeDeps();
      await handleTalk(deps, { householdId: 'h1', text: 'Hello' });
      const messages = (chat.mock.calls[0] as unknown[])[0] as { content: string }[];
      expect(messages[0].content).toContain('TELL_FAMILY:');
    });
  });
  describe('streaming', () => {
    it('forwards the model words as they arrive and still processes the full reply', async () => {
      const parts = ['I will let ', 'Priya know.', '\nTELL_FAMILY: Avni misses Rohan.', '\nMOOD: calm'];
      const chatStream = vi.fn(async (_m: unknown, _o: unknown, onDelta: (d: string) => void) => {
        for (const p of parts) onDelta(p);
        return parts.join('');
      });
      const { deps, alerts, chat } = makeDeps({ chatStream });
      const seen: string[] = [];
      const r = await handleTalk(deps, { householdId: 'h1', text: 'Tell Priya', onDelta: (d) => seen.push(d) });
      expect(seen).toEqual(parts);
      expect(chat).not.toHaveBeenCalled();
      expect(r.body.reply).toBe('I will let Priya know.');
      expect(alerts).toContainEqual({ reason: 'message', detail: 'Avni misses Rohan.' });
    });

    it('falls back as usual when the stream fails', async () => {
      const { deps } = makeDeps({ chatStream: async () => { throw new Error('503'); } });
      const r = await handleTalk(deps, { householdId: 'h1', text: 'Hello', onDelta: () => {} });
      expect(r.body.reply).toMatch(/^I'm right here/);
    });
  });
  it('keeps a Marathi family in Marathi even though Marathi is written in Devanagari too', async () => {
    const { deps, chat } = makeDeps({ loadContext: async () => ({ ...ctx, household: { ...ctx.household, language: 'mr-IN' } }) });
    await handleTalk(deps, { householdId: 'h1', text: 'आज कोणता दिवस आहे' });
    const messages = (chat.mock.calls[0] as unknown[])[0] as { content: string }[];
    expect(messages[0].content).toContain('Usually reply in Marathi');
    expect(messages.at(-1)!.content).toBe('आज कोणता दिवस आहे');
  });
  describe('the tablet chooses the language', () => {
    it('replies in the language picked on the tablet', async () => {
      const { deps, chat } = makeDeps();
      await handleTalk(deps, { householdId: 'h1', text: '¿Qué día es hoy?', language: 'es-ES' });
      const messages = (chat.mock.calls[0] as unknown[])[0] as { content: string }[];
      expect(messages[0].content).toContain('Usually reply in Spanish');
    });
    it('falls back in that language without the model, with the date in that language', async () => {
      const { deps } = makeDeps({ chat: async () => { throw new Error('no key'); } });
      const r = await handleTalk(deps, { householdId: 'h1', text: 'Hola', language: 'es-ES' });
      expect(r.body.reply).toBe('Estoy aquí contigo. Respiremos despacio, juntos.');
      const t = await handleTalk(deps, { householdId: 'h1', text: '¿qué día es hoy?', language: 'es-ES' });
      expect(t.body.reply).toMatch(/^Hoy es sábado/);
    });
    it('ignores a language it does not support', async () => {
      const { deps, chat } = makeDeps();
      await handleTalk(deps, { householdId: 'h1', text: 'Hello', language: 'xx-XX' });
      const messages = (chat.mock.calls[0] as unknown[])[0] as { content: string }[];
      expect(messages[0].content).toContain('Usually reply in English');
    });
  });
});

describe('handleTalk recordings', () => {
  it('keeps the id of the clip the tablet recorded with the turn', async () => {
    const { deps, logged } = makeDeps();
    await handleTalk(deps, { householdId: 'h1', text: 'My school was by the lake.', recordingId: '0b2d3b1e-4c7a-4d2a-9c1f-7f1e2a3b4c5d' });
    expect(logged[0].payload).toMatchObject({ recordingId: '0b2d3b1e-4c7a-4d2a-9c1f-7f1e2a3b4c5d' });
  });
  it('records no clip id when the tablet sent none', async () => {
    const { deps, logged } = makeDeps();
    await handleTalk(deps, { householdId: 'h1', text: 'Hello Remi' });
    expect(logged[0].payload).toMatchObject({ recordingId: null });
  });
});

describe('handleTalk steering', () => {
  it('marks a family question asked when Remi raises it, and never speaks the ASKED line', async () => {
    const asked: string[] = [];
    const { deps } = makeDeps({
      chat: async () => 'Your son wonders about 1971. What do you remember?\nASKED: q1\nMOOD: calm',
      loadContext: async () => ({ ...ctx, pendingQuestions: [{ id: 'q1', question: 'Ask about 1971' }] }),
      markQuestionAsked: async (id) => { asked.push(id); },
    });
    const r = await handleTalk(deps, { householdId: 'h1', text: 'Nothing much today.' });
    expect(r.body.reply).toBe('Your son wonders about 1971. What do you remember?');
    expect(asked).toEqual(['q1']);
  });
});

describe('handleTalk on the photo screen', () => {
  it('keeps which photo she was looking at, and who she was shown, with the turn', async () => {
    const { deps, logged } = makeDeps();
    await handleTalk(deps, { householdId: 'h1', text: 'That was our wedding.', photo: { id: 'ph1', note: 'Wedding, 1968' }, personName: 'Ramesh' });
    expect(logged[0].payload).toMatchObject({ photoId: 'ph1', personName: 'Ramesh' });
  });
  it('tells Remi about the photo even if it steered a moment ago', async () => {
    const { deps, chat } = makeDeps({ loadContext: async () => ({ ...ctx, lastSteerAt: new Date('2026-10-17T07:39:00Z') }) });
    await handleTalk(deps, { householdId: 'h1', text: 'Look at this one.', photo: { id: 'ph1', note: 'Wedding, 1968' } });
    const system = (chat.mock.calls[0] as unknown as [{ role: string; content: string }[]])[0][0].content;
    expect(system).toContain('Wedding, 1968');
  });
});

describe('handleTalk and her consent', () => {
  it('stops keeping her voice when she asks, tells the family, and says so without the model', async () => {
    const flags: boolean[] = [];
    const { deps, alerts, chat } = makeDeps({ setRecordVoice: async (_h, on) => { flags.push(on); } });
    const r = await handleTalk(deps, { householdId: 'h1', text: 'Please stop recording me now.' });
    expect(flags).toEqual([false]);
    expect(alerts.some((a) => a.reason === 'message')).toBe(true);
    expect(chat).not.toHaveBeenCalled();
    expect(r.body.reply).toMatch(/won't keep/i);
  });
});
