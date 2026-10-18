import { describe, it, expect } from 'vitest';
import { detectSafetyWords } from '@/core/safety';

describe('detectSafetyWords', () => {
  it.each([
    ['My knee hurts so much', ['pain']],
    ['I fell in the bathroom', ['fall']],
    ['Where am I? I want to go home', ['lost']],
    ["I'm scared", ['fear']],
    ['मुझे दर्द हो रहा है', ['pain']],
    ['मैं गिर गई', ['fall']],
    ['I fell and now it hurts', ['pain', 'fall']],
  ])('%s', (text, expected) => {
    expect(detectSafetyWords(text)).toEqual(expected);
  });
  it('is quiet for ordinary talk', () => {
    expect(detectSafetyWords('What is for lunch today?')).toEqual([]);
  });
});
