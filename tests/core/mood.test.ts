import { describe, it, expect } from 'vitest';
import { parseMoodTag } from '@/core/mood';

describe('parseMoodTag', () => {
  it('splits reply and mood line', () => {
    expect(parseMoodTag('It is Saturday.\nMOOD: calm')).toEqual({ reply: 'It is Saturday.', mood: 'calm' });
  });
  it('accepts bracketed and lowercase tags', () => {
    expect(parseMoodTag('Hello.\n[mood: Anxious]')).toEqual({ reply: 'Hello.', mood: 'anxious' });
  });
  it('unknown mood word → unknown, tag still removed', () => {
    expect(parseMoodTag('Hi.\nMOOD: sleepy')).toEqual({ reply: 'Hi.', mood: 'unknown' });
  });
  it('no tag → unknown', () => {
    expect(parseMoodTag('Hi there.')).toEqual({ reply: 'Hi there.', mood: 'unknown' });
  });
  it('strips reasoning first', () => {
    expect(parseMoodTag('<think>x</think>Hi.\nMOOD: happy')).toEqual({ reply: 'Hi.', mood: 'happy' });
  });
});

import { extractTellFamily } from '@/core/mood';

describe('extractTellFamily', () => {
  it('takes the message for the family out of the spoken reply', () => {
    expect(extractTellFamily('Of course. I will let Priya know.\nTELL_FAMILY: Kamla would like Rohan to call her.'))
      .toEqual({ reply: 'Of course. I will let Priya know.', message: 'Kamla would like Rohan to call her.' });
  });
  it('accepts brackets and lower case', () => {
    expect(extractTellFamily('Okay.\n[tell_family: She misses Rohan]')).toEqual({ reply: 'Okay.', message: 'She misses Rohan' });
  });
  it('returns no message when there is none or it is empty', () => {
    expect(extractTellFamily('Hello.')).toEqual({ reply: 'Hello.', message: null });
    expect(extractTellFamily('Hello.\nTELL_FAMILY:   ')).toEqual({ reply: 'Hello.', message: null });
  });
});
