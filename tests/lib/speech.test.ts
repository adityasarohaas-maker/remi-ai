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
