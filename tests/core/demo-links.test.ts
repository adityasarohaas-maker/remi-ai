import { describe, it, expect } from 'vitest';
import { demoLinks } from '@/core/demo-links';

describe('demoLinks', () => {
  it('never links to a tablet it does not have', () => {
    expect(demoLinks(undefined)).toEqual({ tablet: null, portal: true });
    expect(demoLinks('')).toEqual({ tablet: null, portal: true });
    expect(demoLinks('abc')).toEqual({ tablet: '/patient/abc', portal: true });
  });
});
