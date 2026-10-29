// The forest, made of the same living light as Kodi: trees, grass, mushrooms, flowers, leaves, fireflies; the stars apart.
import { cloud, add, onEllipsoid, rnd, mixc, PART, type Cloud } from './cloud';
import type { TierBudget } from '@/core/forest-tier';
import { KODI_COLOURS } from './kodi-cloud';

export const GROUND = -1.32;
export const TREE_SEED = 20261022;

const LEAF_LOW = [0.24, 0.64, 0.58], LEAF_TOP = [0.66, 1.0, 0.84], GLINT = [1.0, 0.86, 0.52], TRUNK = [1.0, 0.8, 0.64];
const BLOSSOM = [[1.0, 0.66, 0.82], [1.0, 0.9, 0.62], [0.72, 0.8, 1.0]];

export function buildForestCloud(budget: TierBudget, random: () => number): { forest: Cloud; stars: Cloud; crowns: number[][] } {
  // enough room for the high tier's twelve trees with crowns; the buffer is sliced to what was used
  const F = cloud(budget.trees * 18000 + budget.grass + budget.leaves + budget.fireflies + 6 * 370 + 260 * 7 + 1000);
  const crownTops: number[][] = [];
  const R = (a: number, b: number) => rnd(random, a, b);
  // the low tier draws each tree with about half the points
  const density = budget.trees <= 6 ? 0.5 : 1;
  // the clearing: no tree reaches into the sky above Kodi
  const addTree = (p: number[], n: number[], col: number[], size: number) => {
    if (Math.abs(p[0]) < 3.0 && p[1] > GROUND + 1.5) return;
    add(F, p, n, col, size, PART.TREE, random);
  };

  function trunk(x: number, z: number, h: number, w: number) {
    for (let i = 0; i < 700 * h * density; i++) { // flaring into roots at the foot
      const t = random(), a = R(0, 6.28), r = w * (1.4 - 0.6 * t + (t < 0.08 ? (0.08 - t) * 10 : 0));
      addTree([x + Math.cos(a) * r, GROUND + t * h, z + Math.sin(a) * r], [Math.cos(a), 0.1, Math.sin(a)], TRUNK, R(2, 3.4));
    }
  }
  function roundTree(x: number, z: number, h: number) {
    trunk(x, z, h * 0.6, h * 0.06);
    const blossom = random() < 0.35 ? BLOSSOM[Math.floor(random() * 3)] : null;
    const crowns = 4 + Math.floor(random() * 3);
    for (let k = 0; k < crowns; k++) {
      const cr = h * R(0.22, 0.32), cy = GROUND + h * R(0.6, 0.92), cx = x + R(-0.32, 0.32) * h * 0.55;
      crownTops.push([cx, cy, z, cr]);
      for (let i = 0; i < 2100 * cr * cr * density; i++) {
        const e = onEllipsoid([cx, cy, z + R(-0.15, 0.15), cr * 1.15, cr * 0.9, cr], random() < 0.94, random);
        const lift = (e.p[1] - (GROUND + h * 0.5)) / (h * 0.6);
        const col = random() < 0.03 ? GLINT : blossom && random() < 0.12 ? blossom : mixc(LEAF_LOW, LEAF_TOP, Math.min(1, Math.max(0, lift)));
        addTree(e.p, e.n, col, random() < 0.05 ? R(3.8, 6) : R(1.9, 3.6));
      }
    }
  }
  function pineTree(x: number, z: number, h: number) {
    trunk(x, z, h * 0.3, h * 0.045);
    const tiers = 4 + Math.floor(random() * 2);
    for (let k = 0; k < tiers; k++) {
      const y0 = GROUND + h * (0.18 + 0.68 * k / tiers), th = h * 0.36, r0 = h * 0.3 * (1 - k / (tiers + 0.8));
      crownTops.push([x, y0 + th * 0.4, z, r0]);
      for (let i = 0; i < 1500 * r0 * th * density; i++) {
        const t = Math.pow(random(), 0.8), a = R(0, 6.28), r = r0 * (1 - t) * (random() < 0.82 ? 1 : random());
        const droop = (1 - t) * 0.12 * r0;
        const nn = [Math.cos(a), r0 / th, Math.sin(a)], l = Math.hypot(nn[0], nn[1], nn[2]);
        const col = random() < 0.03 ? GLINT : mixc(LEAF_LOW, LEAF_TOP, Math.min(1, (y0 + t * th - GROUND) / h + 0.15));
        addTree([x + Math.cos(a) * r, y0 + t * th - droop, z + Math.sin(a) * r], nn.map((v) => v / l), col, random() < 0.04 ? R(3.4, 5) : R(1.5, 3));
      }
    }
  }
  const planted: number[][] = [];
  function plant(xr: number[], zr: number[], hr: number[], count: number, gap: number) {
    for (let i = 0; i < count; i++) {
      let x = 0, z = 0, tries = 0;
      do { x = R(xr[0], xr[1]); z = R(zr[0], zr[1]); tries++; } while (planted.some(([px, pz]) => Math.hypot(px - x, pz - z) < gap) && tries < 60);
      planted.push([x, z]);
      const h = R(hr[0], hr[1]);
      (random() < 0.4 ? pineTree : roundTree)(x, z, h);
    }
  }
  // the budget's trees shared across the four groves, the nearer ones first
  const grove = [0, 1, 2, 3].map((g) => Math.floor(budget.trees / 4) + (g < budget.trees % 4 ? 1 : 0));
  plant([-10.5, -3.6], [-6.5, -2.2], [3.0, 4.2], grove[0], 2.6);   // the grove on the left
  plant([3.6, 10.5], [-6.5, -2.2], [3.0, 4.2], grove[1], 2.6);     // and on the right
  plant([-15, -4], [-14, -9], [4.2, 5.8], grove[2], 3.2);          // the deep woods behind, leaving the sky clear above Kodi
  plant([4, 15], [-14, -9], [4.2, 5.8], grove[3], 3.2);

  for (let i = 0; i < budget.grass; i++) { // grass: short glowing blades, thickest near us
    const z = 3.8 - Math.pow(random(), 2.2) * 16, x = R(-16, 16), h = R(0.06, 0.34), t = random();
    add(F, [x + t * 0.03, GROUND + t * h, z], [0, 1, 0.3], t > 0.78 ? [0.66, 1.0, 0.72] : [0.26, 0.6, 0.44], R(1.4, 2.8), PART.GRASS, random);
  }
  function mushroom(x: number, z: number, s: number, cap: number[]) {
    for (let i = 0; i < 90; i++) { const t = random(), a = R(0, 6.28); add(F, [x + Math.cos(a) * 0.06 * s, GROUND + t * 0.32 * s, z + Math.sin(a) * 0.06 * s], [Math.cos(a), 0, Math.sin(a)], [0.95, 0.9, 0.8], R(1.2, 2.2), PART.MUSHROOM, random); }
    for (let i = 0; i < 280; i++) { const e = onEllipsoid([x, GROUND + 0.32 * s, z, 0.24 * s, 0.14 * s, 0.24 * s], true, random); if (e.p[1] < GROUND + 0.3 * s) continue; add(F, e.p, [0, 1, 0.4], random() < 0.12 ? [1, 1, 1] : cap, R(1.6, 3.4), PART.MUSHROOM, random); }
  }
  ([[-2.3, 0.8, 1, [0.45, 0.9, 1.0]], [-1.7, 1.4, 0.7, [0.45, 0.9, 1.0]], [2.1, 0.6, 1.1, [1.0, 0.55, 0.82]], [2.8, -0.4, 0.8, [1.0, 0.55, 0.82]], [-3.4, -1.2, 0.9, [1.0, 0.8, 0.5]], [3.6, 1.5, 0.6, [0.45, 0.9, 1.0]]] as [number, number, number, number[]][])
    .forEach(([x, z, s, c]) => mushroom(x, z, s, c));
  for (let i = 0; i < 260; i++) { // little flowers dotted in the grass
    const x = R(-7, 7), z = R(-4, 3), col = [[1, 0.75, 0.85], [1, 0.95, 0.7], [0.75, 0.8, 1]][i % 3];
    for (let k = 0; k < 7; k++) add(F, [x + R(-0.035, 0.035), GROUND + 0.13 + R(-0.02, 0.02), z + R(-0.035, 0.035)], [0, 1, 0], col, R(1.4, 2.6), PART.MUSHROOM, random);
  }
  for (let i = 0; i < budget.leaves && crownTops.length; i++) { // leaves let go of the crowns and drift down
    const [cx, cy, cz, cr] = crownTops[Math.floor(random() * crownTops.length)];
    add(F, [cx + R(-cr, cr), cy + R(-cr * 0.3, cr * 0.5), cz + R(-0.4, 0.4)], [0, 0, 1], random() < 0.4 ? GLINT : LEAF_TOP, R(2.4, 4), PART.FALLING_LEAF, random);
  }
  for (let i = 0; i < budget.fireflies; i++) { // fireflies all through the woods, more near the ground
    add(F, [R(-14, 14), GROUND + 0.2 + Math.pow(random(), 1.8) * 4, R(-12, 3.5)], [0, 0, 1], random() < 0.7 ? KODI_COLOURS.gold : KODI_COLOURS.mint, R(3, 6.5), PART.FIREFLY, random);
  }

  const S = cloud(budget.stars);
  for (let i = 0; i < budget.stars; i++) { const th = R(0, 6.28), r = R(20, 40); add(S, [r * Math.cos(th) * 1.4, R(4, 22), -r], [0, 0, 1], [0.86, 0.88, 1.0], R(1, 2.6), PART.TREE, random); }
  return { forest: F, stars: S, crowns: crownTops };
}

/** A rabbit that hops through behind Kodi. */
export function buildRabbitCloud(random: () => number): Cloud {
  const Rb = cloud(2600), fur = [0.96, 0.92, 1.0];
  const parts: [number[], number][] = [[[0, 0.17, 0, 0.21, 0.16, 0.14], 1200], [[0.2, 0.33, 0, 0.11, 0.1, 0.09], 520], [[0.16, 0.54, 0.035, 0.03, 0.13, 0.025], 200], [[0.2, 0.53, -0.035, 0.03, 0.12, 0.025], 200], [[-0.22, 0.2, 0, 0.055, 0.055, 0.055], 150], [[0.08, 0.04, 0.07, 0.07, 0.04, 0.04], 120], [[0.08, 0.04, -0.07, 0.07, 0.04, 0.04], 120]];
  for (const [c, n] of parts) for (let i = 0; i < n; i++) { const e = onEllipsoid(c, random() < 0.85, random); add(Rb, e.p, e.n, fur, rnd(random, 1.2, 2.4), PART.ANIMAL, random); }
  for (let i = 0; i < 30; i++) add(Rb, [0.29 + rnd(random, -0.01, 0.01), 0.36 + rnd(random, -0.01, 0.01), 0.05], [0, 0, 1], [1, 0.7, 0.8], 2.2, PART.ANIMAL, random); // a pink nose
  return Rb;
}

/** A bird: a body and two wings, hinged separately so they can flap. */
export function buildBirdClouds(random: () => number): { body: Cloud; wings: [Cloud, Cloud] } {
  const body = cloud(260), col = [0.85, 0.92, 1.0];
  for (let i = 0; i < 260; i++) { const e = onEllipsoid([0, 0, 0, 0.14, 0.05, 0.05], true, random); add(body, e.p, e.n, col, rnd(random, 1.2, 2.2), PART.ANIMAL, random); }
  const wings = [1, -1].map((side) => {
    const w = cloud(420);
    for (let i = 0; i < 420; i++) { const t = random(), chord = (1 - t) * 0.16; add(w, [rnd(random, -chord, chord * 0.4) - t * 0.08, Math.sin(Math.PI * t) * 0.04, side * t * 0.42], [0, 1, 0], col, rnd(random, 1.1, 2), PART.ANIMAL, random); }
    return w;
  }) as [Cloud, Cloud];
  return { body, wings };
}
