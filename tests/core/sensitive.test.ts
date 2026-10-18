import { describe, it, expect } from 'vitest';
import { findSensitiveGuidance } from '@/core/sensitive';
import type { Guidance } from '@/core/types';

const husband: Guidance = {
  id: 'g1', topic: 'Husband Ramesh', triggerWords: ['Ramesh', 'my husband', 'पति'],
  approach: 'share_memory', familyScript: 'Ramesh loved your rajma.', callPersonName: null,
};

describe('findSensitiveGuidance', () => {
  it('matches a trigger word case-insensitively, ignoring punctuation', () => {
    expect(findSensitiveGuidance('Where is RAMESH?', [husband])?.id).toBe('g1');
    expect(findSensitiveGuidance('Where is my husband!', [husband])?.id).toBe('g1');
  });
  it('matches Hindi words including vowel signs', () => {
    expect(findSensitiveGuidance('मेरे पति कहाँ हैं?', [husband])?.id).toBe('g1');
  });
  it('does not match inside other words', () => {
    expect(findSensitiveGuidance('Rameshwaram trip photos', [husband])).toBeNull();
  });
  it('returns null with no guidance', () => {
    expect(findSensitiveGuidance('Where is Ramesh?', [])).toBeNull();
  });
});
