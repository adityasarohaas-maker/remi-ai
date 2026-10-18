import { describe, it, expect } from 'vitest';
import { field } from '@/lib/form';

describe('field', () => {
  it('trims and caps length', () => {
    const f = new FormData(); f.set('name', '  Rohan  '); f.set('long', 'x'.repeat(50));
    expect(field(f, 'name', 80)).toBe('Rohan');
    expect(field(f, 'long', 10)).toBe('x'.repeat(10));
  });
  it('returns empty string for missing or file values', () => {
    const f = new FormData(); f.set('file', new Blob(['a']));
    expect(field(f, 'missing', 10)).toBe('');
    expect(field(f, 'file', 10)).toBe('');
  });
});
