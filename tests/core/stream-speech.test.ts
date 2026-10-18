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
