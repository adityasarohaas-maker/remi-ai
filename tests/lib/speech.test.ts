import { describe, it, expect } from 'vitest';
import { speechRecognitionCtor } from '@/lib/speech';

describe('speechRecognitionCtor', () => {
  it('prefers the standard constructor, then webkit, else null', () => {
    class A {}
    class B {}
    expect(speechRecognitionCtor({ SpeechRecognition: A, webkitSpeechRecognition: B })).toBe(A);
    expect(speechRecognitionCtor({ webkitSpeechRecognition: B })).toBe(B);
    expect(speechRecognitionCtor({})).toBeNull();
    expect(speechRecognitionCtor(undefined)).toBeNull();
  });
});

import { speechErrorAction } from '@/lib/speech';

describe('speechErrorAction (final review C1)', () => {
  it('switches to typing when speech exists but cannot work', () => {
    for (const code of ['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'unsupported']) {
      expect(speechErrorAction(code)).toBe('type');
    }
  });
  it('asks again when nothing was heard', () => {
    expect(speechErrorAction('no-speech')).toBe('again');
    expect(speechErrorAction('')).toBe('again');
  });
  it('stays quiet when the listening was cancelled', () => {
    expect(speechErrorAction('aborted')).toBe('quiet');
  });
});

import { createListener, type SpeechRecognitionLike } from '@/lib/speech';

class FakeRec implements SpeechRecognitionLike {
  static all: FakeRec[] = [];
  lang = ''; interimResults = true; maxAlternatives = 0; continuous = false;
  onresult: SpeechRecognitionLike['onresult'] = null;
  onerror: SpeechRecognitionLike['onerror'] = null;
  onend: SpeechRecognitionLike['onend'] = null;
  running = false;
  constructor() { FakeRec.all.push(this); }
  start() { this.running = true; }
  stop() { this.running = false; this.onend?.(); }
  abort() { this.stop(); }
  say(text: string, isFinal = true) {
    const result = Object.assign([{ transcript: text }], { isFinal });
    this.onresult?.({ resultIndex: 0, results: [result] });
  }
}
const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('createListener', () => {
  it('listens continuously, passes on final phrases only, and restarts when the browser stops it', async () => {
    FakeRec.all = [];
    const heard: string[] = [];
    const l = createListener(FakeRec, { lang: 'en-IN', onText: (t) => heard.push(t), onState: () => {}, restartDelayMs: 0 });
    l.start();
    const rec = FakeRec.all[0];
    expect(rec.continuous).toBe(true);
    expect(rec.lang).toBe('en-IN');
    rec.say('Remi what', false);
    rec.say('Remi what day is it');
    expect(heard).toEqual(['Remi what day is it']);
    rec.running = false; rec.onend?.(); // Chrome ends recognition after a silence
    await wait(5);
    expect(rec.running).toBe(true);
  });

  it('stays paused while Remi speaks and does not restart until resumed', async () => {
    FakeRec.all = [];
    const l = createListener(FakeRec, { lang: 'en-IN', onText: () => {}, onState: () => {}, restartDelayMs: 0 });
    l.start();
    const rec = FakeRec.all[0];
    l.pause();
    await wait(5);
    expect(rec.running).toBe(false);
    l.resume();
    await wait(5);
    expect(rec.running).toBe(true);
  });

  it('gives up and reports blocked when the microphone is not allowed', async () => {
    FakeRec.all = [];
    const states: string[] = [];
    const l = createListener(FakeRec, { lang: 'en-IN', onText: () => {}, onState: (s) => states.push(s), restartDelayMs: 0 });
    l.start();
    const rec = FakeRec.all[0];
    rec.onerror?.({ error: 'not-allowed' });
    rec.running = false; rec.onend?.();
    await wait(5);
    expect(rec.running).toBe(false);
    expect(states.at(-1)).toBe('blocked');
  });
});

import { speakAsync } from '@/lib/speech';

describe('speakAsync', () => {
  it('resolves when the voice finishes, and does not hang if the browser never says so', async () => {
    const spoken: { text: string; onend?: () => void }[] = [];
    const g = globalThis as Record<string, unknown>;
    g.SpeechSynthesisUtterance = class { text: string; lang = ''; rate = 1; voice = null; onend?: () => void; onerror?: () => void; constructor(t: string) { this.text = t; } };
    g.window = { speechSynthesis: { cancel() {}, getVoices: () => [], speak: (u: { text: string; onend?: () => void }) => spoken.push(u) } };
    try {
      const done = speakAsync('Hello Avni', 'en-IN');
      spoken[0].onend?.();
      await expect(done).resolves.toBeUndefined();
      await expect(speakAsync('never ends', 'en-IN', 20)).resolves.toBeUndefined();
    } finally {
      delete g.window; delete g.SpeechSynthesisUtterance;
    }
  });
});

describe('createListener: live words and early finish', () => {
  it('shows words live and finishes once they stop changing, without waiting for the browser', async () => {
    FakeRec.all = [];
    const heard: string[] = [];
    const live: string[] = [];
    const l = createListener(FakeRec, { lang: 'en-IN', onText: (t) => heard.push(t), onInterim: (t) => live.push(t), onState: () => {}, restartDelayMs: 0, settleMs: 30 });
    l.start();
    const rec = FakeRec.all[0];
    expect(rec.interimResults).toBe(true);
    rec.say('Remi what', false);
    rec.say('Remi what day is it', false);
    expect(live).toEqual(['Remi what', 'Remi what day is it']);
    expect(heard).toEqual([]);
    await wait(60);
    expect(heard).toEqual(['Remi what day is it']);
    rec.say('Remi what day is it', true); // the browser's own final arrives late: not a second turn
    expect(heard).toEqual(['Remi what day is it']);
  });

  it('uses the browser final when it comes first', async () => {
    FakeRec.all = [];
    const heard: string[] = [];
    const l = createListener(FakeRec, { lang: 'en-IN', onText: (t) => heard.push(t), onState: () => {}, restartDelayMs: 0, settleMs: 30 });
    l.start();
    const rec = FakeRec.all[0];
    rec.say('hello', false);
    rec.say('hello Remi', true);
    await wait(60);
    expect(heard).toEqual(['hello Remi']);
  });
});

describe('speakAsync word beats', () => {
  it('calls onWord for each spoken word boundary', async () => {
    type U = { text: string; onend?: () => void; onboundary?: (e: { name: string }) => void };
    const spoken: U[] = [];
    const g = globalThis as Record<string, unknown>;
    g.SpeechSynthesisUtterance = class { text: string; lang = ''; rate = 1; voice = null; constructor(t: string) { this.text = t; } };
    g.window = { speechSynthesis: { cancel() {}, getVoices: () => [], speak: (u: U) => spoken.push(u) } };
    try {
      let beats = 0;
      const done = speakAsync('Hello Avni', 'en-IN', 1000, { onWord: () => beats++ });
      spoken[0].onboundary?.({ name: 'word' });
      spoken[0].onboundary?.({ name: 'sentence' });
      spoken[0].onboundary?.({ name: 'word' });
      spoken[0].onend?.();
      await done;
      expect(beats).toBe(2);
    } finally {
      delete g.window; delete g.SpeechSynthesisUtterance;
    }
  });
});
