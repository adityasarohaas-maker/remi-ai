import { describe, it, expect } from 'vitest';
import { demoMorningTimes } from '@/core/demo-times';
import { localParts } from '@/core/time';

const TZ = 'Asia/Kolkata';

describe('demoMorningTimes', () => {
  it('puts sample events on this morning in the household time zone once the morning is over', () => {
    const now = new Date('2026-10-18T05:00:00Z'); // 10:30 IST, when the reset cron runs
    const times = demoMorningTimes(now, TZ, [500, 550, 585, 615]);
    expect(times.map((t) => localParts(t, TZ).day)).toEqual(['2026-10-18', '2026-10-18', '2026-10-18', '2026-10-18']);
    expect(localParts(times[0], TZ).minutes).toBe(500); // 08:20
    expect(times.every((t) => t <= now)).toBe(true);
  });
  it('never creates events in the future when seeded early in the day', () => {
    const now = new Date('2026-10-17T21:30:00Z'); // 03:00 IST
    const times = demoMorningTimes(now, TZ, [500, 550, 585, 615]);
    expect(times.every((t) => t <= now)).toBe(true);
    expect(times.map((t) => localParts(t, TZ).day).every((d) => d === '2026-10-18')).toBe(true);
  });
});
