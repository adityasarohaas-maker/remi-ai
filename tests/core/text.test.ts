import { describe, it, expect } from 'vitest';
import { stripReasoning } from '@/core/text';

describe('stripReasoning', () => {
  it('removes a full think block', () => {
    expect(stripReasoning('<think>plan</think>\nHello there.')).toBe('Hello there.');
  });
  it('removes everything before a dangling closing tag', () => {
    expect(stripReasoning('plan plan</think> Hi.')).toBe('Hi.');
  });
  it('leaves normal text alone', () => {
    expect(stripReasoning('  Good morning.  ')).toBe('Good morning.');
  });
});

describe('stripReasoning — truncated reasoning (final review I1)', () => {
  it('drops an unclosed think block instead of speaking it', () => {
    expect(stripReasoning('<think>The user asks what day it is, so I')).toBe('');
    expect(stripReasoning('Hello.<think>more reasoning')).toBe('Hello.');
  });
});

import { looksLikeReasoning } from '@/core/text';

describe('looksLikeReasoning: a model thinking out loud instead of answering', () => {
  it('spots planning written as the reply', () => {
    for (const s of [
      'The user wants another story. Since Avni previously asked',
      'User asks for a story, so I should',
      'We need to reply in Hindi',
      'Okay, so the user said',
      'Let me think about what Avni',
      "Let's craft a story about a garden",
      'I should tell a gentle story',
      'Avni is asking for a story. I will',
      'She asked for a story, so',
    ]) expect(looksLikeReasoning(s)).toBe(true);
  });

  it('lets real replies through', () => {
    for (const s of [
      'Once there was a little mouse named Ravi.',
      "Let's have some tea together!",
      'Oh, how lovely that sounds.',
      'I should love to hear about your garden.',
      'She sounds wonderful, your granddaughter.',
      'एक गांव में एक छोटा सा कुत्ता रहता था।',
    ]) expect(looksLikeReasoning(s)).toBe(false);
  });
});
