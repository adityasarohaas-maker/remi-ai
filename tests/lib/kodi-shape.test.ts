import { describe, it, expect } from 'vitest';
import { buildKodi, KODI_GROUP } from '@/lib/kodi-shape';

describe('buildKodi', () => {
  const k = buildKodi(1);
  const count = (g: number) => k.group.filter((x) => x === g).length;

  it('makes every part of Kodi, with matching attribute lengths', () => {
    const n = k.group.length;
    expect(n).toBeGreaterThan(20000);
    expect(k.position.length).toBe(n * 3);
    expect(k.colorDay.length).toBe(n * 3);
    expect(k.colorNight.length).toBe(n * 3);
    expect(k.size.length).toBe(n);
    expect(k.center.length).toBe(n * 2);
    expect(k.rand.length).toBe(n * 4);
    for (const g of Object.values(KODI_GROUP)) expect(count(g)).toBeGreaterThan(0);
  });

  it('scales the particle count down for small or slow tablets', () => {
    expect(buildKodi(0.5).group.length).toBeLessThan(k.group.length * 0.6);
  });

  it('keeps Kodi inside its frame and colours in range', () => {
    for (let i = 0; i < k.group.length; i++) {
      if (k.group[i] === KODI_GROUP.AURA || k.group[i] === KODI_GROUP.HEART) continue;
      expect(Math.abs(k.position[i * 3])).toBeLessThan(1.4);
      expect(k.position[i * 3 + 1]).toBeGreaterThan(-1.8);
      expect(k.position[i * 3 + 1]).toBeLessThan(2.05);
    }
    expect(Math.max(...k.colorDay)).toBeLessThanOrEqual(1);
    expect(Math.min(...k.colorNight)).toBeGreaterThanOrEqual(0);
  });

  it('gives each heart one shared rise timing, so hearts float as shapes', () => {
    const phases = new Set<number>();
    for (let i = 0; i < k.group.length; i++) if (k.group[i] === KODI_GROUP.HEART) phases.add(k.rand[i * 4]);
    expect(phases.size).toBe(3);
  });
});
