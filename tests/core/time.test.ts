import { describe, it, expect } from 'vitest';
import { localParts, dayRangeUtc, parseHHMM, partOfDay } from '@/core/time';

describe('localParts', () => {
  it('uses the household time zone, not the server clock (00:30 IST is already the next day)', () => {
    const p = localParts(new Date('2026-10-17T19:00:00Z'), 'Asia/Kolkata');
    expect(p.day).toBe('2026-10-18');
    expect(p.minutes).toBe(30);
    expect(p.weekday).toBe('Sunday');
    expect(p.partOfDay).toBe('night');
    expect(p.prettyTime).toContain('12:30');
  });
});

describe('dayRangeUtc', () => {
  it('returns the UTC bounds of a local day', () => {
    const r = dayRangeUtc('2026-10-18', 'Asia/Kolkata');
    expect(r.start.toISOString()).toBe('2026-10-17T18:30:00.000Z');
    expect(r.end.toISOString()).toBe('2026-10-18T18:30:00.000Z');
  });
});

describe('parseHHMM / partOfDay', () => {
  it('parses HH:MM and HH:MM:SS', () => {
    expect(parseHHMM('08:30')).toBe(510);
    expect(parseHHMM('20:05:00')).toBe(1205);
  });
  it('buckets hours', () => {
    expect(partOfDay(4)).toBe('night');
    expect(partOfDay(9)).toBe('morning');
    expect(partOfDay(14)).toBe('afternoon');
    expect(partOfDay(18)).toBe('evening');
    expect(partOfDay(22)).toBe('night');
  });
});
