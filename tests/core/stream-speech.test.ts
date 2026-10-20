import { describe, it, expect } from 'vitest';
import { speakableText, takeSentences } from '@/core/stream-speech';

describe('speakableText', () => {
  it('passes plain text through', () => {
    expect(speakableText('Hello Avni. How are you', false)).toBe('Hello Avni. How are you');
  });

  it('never lets the hidden lines through, even half-written', () => {
    expect(speakableText('I will let Priya know.\nTELL_FAMILY: Avni misses Rohan.\nMOOD: calm', true)).toBe('I will let Priya know.');
    expect(speakableText('I will let Priya know.\nTELL_FA', false)).toBe('I will let Priya know.');
    expect(speakableText('Okay.\n[mood: ha', false)).toBe('Okay.');
    expect(speakableText('Okay.\nM', false)).toBe('Okay.');
  });

  it('keeps a last line that only looks like a tag until it clearly is not', () => {
    expect(speakableText('Okay.\nMaybe we', false)).toBe('Okay.\nMaybe we');
  });

  it('stays silent on SKIP, including while it is still arriving', () => {
    expect(speakableText('SKIP', true)).toBe('');
    expect(speakableText('SK', false)).toBe('');
    expect(speakableText('SKIP\nMOOD: calm', true)).toBe('');
    expect(speakableText('Sky is blue.', false)).toBe('Sky is blue.');
  });

  it('drops model reasoning', () => {
    expect(speakableText('<think>plan</think>Hello.', false)).toBe('Hello.');
    expect(speakableText('<think>still planning', false)).toBe('');
    expect(speakableText('Hello. <thi', false)).toBe('Hello.');
  });
});

describe('takeSentences', () => {
  it('returns only finished sentences while text is still arriving', () => {
    expect(takeSentences('Hello Avni. How are y', 0, false)).toEqual({ sentences: ['Hello Avni.'], upTo: 12 });
  });

  it('continues from where it stopped', () => {
    const text = 'Hello Avni. How are you? I am here';
    expect(takeSentences(text, 12, false)).toEqual({ sentences: ['How are you?'], upTo: 25 });
  });

  it('waits for the space after the stop, so "Dr." or "3.5" mid-word are not cut early', () => {
    expect(takeSentences('It is 3.5', 0, false)).toEqual({ sentences: [], upTo: 0 });
  });

  it('speaks Hindi sentences ending in a danda', () => {
    expect(takeSentences('नमस्ते अवनि। आप कैसी', 0, false).sentences).toEqual(['नमस्ते अवनि।']);
  });

  it('flushes the rest when the reply is complete', () => {
    expect(takeSentences('Hello. I am here', 7, true)).toEqual({ sentences: ['I am here'], upTo: 16 });
    expect(takeSentences('Hello.', 6, true)).toEqual({ sentences: [], upTo: 6 });
  });
});

describe('speakableText with inline hidden lines', () => {
  it('stops at a hidden tag written on the same line', () => {
    expect(speakableText('Hello there. MOOD: calm', true)).toBe('Hello there.');
    expect(speakableText('I will let Priya know. TELL_FAMILY: Avni misses Rohan. More', false)).toBe('I will let Priya know.');
  });
});

describe('takeSentences: speak the first phrase early', () => {
  it('lets the opening phrase go at a comma once it has a few words, so Remi starts talking sooner', () => {
    expect(takeSentences('Oh, how lovely that sounds, and the', 0, false, { firstPhrase: true }))
      .toEqual({ sentences: ['Oh, how lovely that sounds,'], upTo: 28 });
  });
  it('does not cut a phrase that is too short to say on its own', () => {
    expect(takeSentences('Oh, how', 0, false, { firstPhrase: true })).toEqual({ sentences: [], upTo: 0 });
  });
  it('only does this for the opening, and only when asked', () => {
    expect(takeSentences('Oh, how lovely that sounds, and the', 0, false)).toEqual({ sentences: [], upTo: 0 });
    expect(takeSentences('Hello. Oh, how lovely that sounds, and', 7, false, { firstPhrase: true }).sentences).toEqual([]);
  });
  it('still prefers a full sentence when there is one', () => {
    expect(takeSentences('Hello Avni. Oh, how', 0, false, { firstPhrase: true }).sentences).toEqual(['Hello Avni.']);
  });
});

import { createSpokenReply } from '@/core/stream-speech';

describe('createSpokenReply: the server voices the reply as it is written', () => {
  const tick = () => new Promise((r) => setTimeout(r, 0));

  it('makes audio for each sentence as soon as it exists, and sends them in order with their words', async () => {
    const started: string[] = [];
    const sent: { say: string; audio?: string }[] = [];
    let release!: () => void;
    const slowFirst = new Promise<void>((r) => { release = r; });
    const speaker = createSpokenReply({
      synth: async (text) => {
        started.push(text);
        if (started.length === 1) await slowFirst; // the first clip takes longer than the second
        return new TextEncoder().encode(`mp3:${text}`);
      },
      send: (line) => sent.push(line),
    });
    speaker.delta('Oh, how lovely that sounds. The ');
    speaker.delta('roses must be out! MOOD: happy');
    await tick();
    expect(started).toEqual(['Oh, how lovely that sounds.']); // "The roses must be out!" is not finished yet
    const done = speaker.finish();
    await tick();
    expect(started).toEqual(['Oh, how lovely that sounds.', 'The roses must be out!']);
    expect(sent).toEqual([]); // the second clip waits for the first, so Remi never speaks out of order
    release();
    await done;
    expect(sent.map((l) => l.say)).toEqual(['Oh, how lovely that sounds.', 'The roses must be out!']);
    expect(Buffer.from(sent[0].audio!, 'base64').toString()).toBe('mp3:Oh, how lovely that sounds.');
    expect(speaker.said).toBe('Oh, how lovely that sounds. The roses must be out!');
  });

  it('still sends the words when the audio fails, so the tablet can say them in its own voice', async () => {
    const sent: { say: string; audio?: string }[] = [];
    const speaker = createSpokenReply({ synth: async () => { throw new Error('azure down'); }, send: (l) => sent.push(l) });
    speaker.delta('Hello there.');
    await speaker.finish();
    expect(sent).toEqual([{ say: 'Hello there.' }]);
  });

  it('says nothing for SKIP', async () => {
    const sent: unknown[] = [];
    const speaker = createSpokenReply({ synth: async () => new Uint8Array([1]), send: (l) => sent.push(l) });
    speaker.delta('SKIP');
    await speaker.finish();
    expect(sent).toEqual([]);
    expect(speaker.said).toBe('');
  });
});
