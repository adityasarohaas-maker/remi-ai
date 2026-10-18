import { describe, it, expect } from 'vitest';
import { isNightTheme, kodiFeeling } from '@/core/kodi';

describe('isNightTheme', () => {
  it('is dark from 7 pm to 6 am in her home', () => {
    expect(isNightTheme(19 * 60)).toBe(true);
    expect(isNightTheme(23 * 60 + 30)).toBe(true);
    expect(isNightTheme(5 * 60 + 59)).toBe(true);
    expect(isNightTheme(6 * 60)).toBe(false);
    expect(isNightTheme(18 * 60 + 59)).toBe(false);
  });
});

describe('kodiFeeling', () => {
  it('cares when she sounds sad or worried', () => {
    expect(kodiFeeling({ mood: 'sad' }).emotion).toBe('caring');
    expect(kodiFeeling({ mood: 'anxious' }).emotion).toBe('caring');
  });

  it('stays calm and still when she is agitated, and tilts its head when she is confused', () => {
    expect(kodiFeeling({ mood: 'agitated' })).toEqual({ emotion: 'calm' });
    expect(kodiFeeling({ mood: 'confused' })).toEqual({ emotion: 'calm', gesture: 'tilt' });
  });

  it('is happy with her', () => {
    expect(kodiFeeling({ mood: 'happy' }).emotion).toBe('happy');
  });

  it('waves when Remi greets her, in English or Hindi', () => {
    expect(kodiFeeling({ mood: 'calm', reply: 'Hello Avni, how are you?' }).gesture).toBe('wave');
    expect(kodiFeeling({ reply: 'नमस्ते अवनि, आप कैसी हैं?' }).gesture).toBe('wave');
    expect(kodiFeeling({ reply: 'Good morning, Avni.' }).gesture).toBe('wave');
  });

  it('celebrates a finished reminder and stays gentle after a call for help', () => {
    expect(kodiFeeling({ event: 'reminder-done' })).toEqual({ emotion: 'happy', gesture: 'hop' });
    expect(kodiFeeling({ event: 'help', mood: 'happy' })).toEqual({ emotion: 'caring' });
  });

  it('is calm when it knows nothing', () => {
    expect(kodiFeeling({})).toEqual({ emotion: 'calm' });
    expect(kodiFeeling({ mood: 'unknown' })).toEqual({ emotion: 'calm' });
  });
});
