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
