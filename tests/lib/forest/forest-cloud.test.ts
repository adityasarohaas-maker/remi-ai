import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/seeded';
import { PART } from '@/lib/forest/cloud';
import { TIER_BUDGET } from '@/core/forest-tier';
import { buildForestCloud, buildRabbitCloud, buildBirdClouds, GROUND, TREE_SEED } from '@/lib/forest/forest-cloud';

const { forest, stars, crowns } = buildForestCloud(TIER_BUDGET.high, mulberry32(TREE_SEED));
describe('forest cloud', () => {
  it('stays within the high budget and leaves room in the buffer', () => { expect(forest.i).toBeLessThan(260000); expect(forest.i).toBeGreaterThan(150000); expect(stars.i).toBe(2200); });
  it('keeps the sky above Kodi clear of trees', () => {
    for (let i = 0; i < forest.i; i++) if (forest.part[i] === PART.TREE) { const x = forest.pos[i * 3], y = forest.pos[i * 3 + 1]; if (Math.abs(x) < 3.0 && y > GROUND + 1.5) throw new Error(`tree at ${x},${y}`); }
  });
  it('grows everything from the ground up', () => {
    // one assertion over the whole cloud: an expect() per point is a quarter of a million calls and times out on a busy machine
    let below = 0;
    for (let i = 0; i < forest.i; i++) if (forest.pos[i * 3 + 1] < GROUND - 0.05) below++;
    expect(below).toBe(0);
  });
  it('seeds falling leaves from the crowns', () => { expect(crowns.length).toBeGreaterThan(10); });
  it('fits the low budget', () => { expect(buildForestCloud(TIER_BUDGET.low, mulberry32(1)).forest.i).toBeLessThan(80000); });
  it('makes the creatures', () => {
    expect(buildRabbitCloud(mulberry32(2)).i).toBeGreaterThan(2000);
    const b = buildBirdClouds(mulberry32(2)); expect(b.body.i).toBe(260); expect(b.wings[0].i).toBe(420);
  });
});
