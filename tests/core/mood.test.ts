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
