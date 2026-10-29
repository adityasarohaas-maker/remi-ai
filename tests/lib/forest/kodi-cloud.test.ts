import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/seeded';
import { PART } from '@/lib/forest/cloud';
import { buildKodiCloud, KODI_EYE } from '@/lib/forest/kodi-cloud';

const k = buildKodiCloud(15000, mulberry32(1));
describe('Kodi cloud', () => {
  it('fills the cloud with the asked count, all parts present', () => {
    expect(k.i).toBe(15000);
    const parts = new Set(Array.from(k.part)); for (const p of [0, 1, 2, 3, 4, 5]) expect(parts.has(p)).toBe(true);
  });
  it('keeps the eyes clear of skin points so the face reads', () => {
    for (let i = 0; i < k.i; i++) {
      if (k.part[i] !== PART.SKIN) continue;
      const x = k.pos[i * 3], y = k.pos[i * 3 + 1], z = k.pos[i * 3 + 2];
      if (z <= 0.2) continue;
      const inEye = [-KODI_EYE.x, KODI_EYE.x].some((ex) => ((x - ex) / KODI_EYE.rx) ** 2 + ((y - KODI_EYE.y) / KODI_EYE.ry) ** 2 < 1);
      expect(inEye).toBe(false);
    }
  });
  it('starts every point off screen at the sides, on the side it belongs to', () => {
    for (let i = 0; i < k.i; i++) expect(Math.abs(k.intro![i * 3])).toBeGreaterThanOrEqual(9);
  });
  it('is the same Kodi for the same seed', () => { expect(buildKodiCloud(200, mulberry32(3)).pos).toEqual(buildKodiCloud(200, mulberry32(3)).pos); });
});
