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
