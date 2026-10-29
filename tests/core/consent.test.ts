import { describe, it, expect } from 'vitest';
import { consentQuestion, parseConsentAnswer, wantsToStopRecording } from '@/core/consent';

describe('consent on the tablet', () => {
  it('asks in plain words, by name', () => {
    expect(consentQuestion('Avni')).toBe('Before we begin, Avni: may I keep your voice and your stories, so your family can hear them, now and later? You can tell me to stop keeping anything, any time.');
  });
  it('understands yes and no in English and Hindi', () => {
    expect(parseConsentAnswer('yes you may')).toBe('yes');
    expect(parseConsentAnswer('Haan, of course')).toBe('yes');
    expect(parseConsentAnswer('हाँ')).toBe('yes');
    expect(parseConsentAnswer('no, I would rather not')).toBe('no');
    expect(parseConsentAnswer('नहीं')).toBe('no');
    expect(parseConsentAnswer('what?')).toBe('unclear');
    expect(parseConsentAnswer('yes and no')).toBe('unclear');
  });
  it('hears her asking Remi to stop keeping her voice', () => {
    expect(wantsToStopRecording('please stop recording me')).toBe(true);
    expect(wantsToStopRecording("don't keep what I say")).toBe(true);
    expect(wantsToStopRecording('stop the music')).toBe(false);
  });
});
