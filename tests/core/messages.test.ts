import { describe, it, expect } from 'vitest';
import { fallbackReply, unsureMessage, noFaceMessage, helpSentMessage, simpleRecognition } from '@/core/messages';

describe('fixed patient strings', () => {
  it('uses Hindi for hi-IN and English otherwise', () => {
    expect(fallbackReply('hi-IN')).toMatch(/[ऀ-ॿ]/);
    expect(fallbackReply('ta-IN')).toMatch(/^I'm right here/);
  });
  it('names the contact or falls back to family', () => {
    expect(unsureMessage('en-IN', 'Priya')).toBe("I'm not sure who this is. Shall I ask Priya?");
    expect(unsureMessage('en-IN', null)).toContain('your family');
    expect(helpSentMessage('en-IN', 'Priya')).toContain('Priya');
  });
  it('no-face message is different from unsure message', () => {
    expect(noFaceMessage('en-IN')).not.toBe(unsureMessage('en-IN', null));
  });
  it('simple recognition', () => {
    expect(simpleRecognition('en-IN', 'Rohan', 'grandson')).toBe('This is Rohan, your grandson.');
  });
});
