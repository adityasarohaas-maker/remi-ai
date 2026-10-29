// Kodi, drawn in light: a head and body of moon-coloured dust, two leaves, a face, arms. Ported from the prototype.
import { cloud, add, onEllipsoid, rnd, PART, type Cloud } from './cloud';

export const KODI_EYE = { x: 0.42, y: 0.62, rx: 0.25, ry: 0.32 };
const HEAD = [0, 0.62, 0, 1.18, 1.06, 0.95], BODY = [0, -0.72, 0, 0.78, 0.72, 0.66];
export const KODI_COLOURS = {
  moon: [0.97, 0.95, 1.0], cream: [1.0, 0.93, 0.8], gold: [1.0, 0.8, 0.45], mint: [0.62, 0.95, 0.75], leaf: [0.5, 0.9, 0.6],
  leafEdge: [0.78, 1.0, 0.82], vein: [0.9, 1.0, 0.85], cheek: [1.0, 0.55, 0.7], eye: [1.0, 0.92, 0.7], smile: [1.0, 0.75, 0.55],
};
const C = KODI_COLOURS;

const inEye = (x: number, y: number, z: number) => z > 0.2 && [-KODI_EYE.x, KODI_EYE.x].some((ex) => ((x - ex) / KODI_EYE.rx) ** 2 + ((y - KODI_EYE.y) / KODI_EYE.ry) ** 2 < 1);
const inCheek = (x: number, y: number, z: number) => z > 0.3 && [-0.74, 0.74].some((ex) => ((x - ex) / 0.2) ** 2 + ((y - 0.2) / 0.12) ** 2 < 1);

function leafPoint(side: number, kind: 'fill' | 'edge' | 'vein', random: () => number): number[] {
  const L = 1.2, ang = side > 0 ? 0.5 : Math.PI - 0.5, ax = Math.cos(ang), ay = Math.sin(ang), t = random();
  const half = Math.sin(Math.PI * Math.pow(t, 0.85)) * 0.34;
  const w = kind === 'edge' ? half * (random() < 0.5 ? -1 : 1) : kind === 'vein' ? rnd(random, -0.012, 0.012) : half * rnd(random, -0.92, 0.92);
  return [0.04 * side + ax * L * t - ay * w, 1.92 + ay * L * t * 0.55 + ax * w * 0.65, Math.sin(Math.PI * t) * 0.12 + (kind === 'fill' ? rnd(random, -0.03, 0.03) : 0)];
}

export function buildKodiCloud(count: number, random: () => number): Cloud {
  const K = cloud(count);
  K.scatter = new Float32Array(count * 3); K.heart = new Float32Array(count * 3); K.intro = new Float32Array(count * 3);
  while (K.i < count) {
    const r = random(), z = random();
    const dust = z < 0.012 ? rnd(random, 7, 11) : z < 0.08 ? rnd(random, 3.6, 5.5) : rnd(random, 1.2, 2.8);
    const s = random() < 0.5 ? -1 : 1;
    if (r < 0.46) {
      let e;
      do e = onEllipsoid(HEAD, random() < 0.9, random); while (inEye(e.p[0], e.p[1], e.p[2]) || inCheek(e.p[0], e.p[1], e.p[2]));
      add(K, e.p, e.n, random() < 0.06 ? C.gold : random() < 0.05 ? C.mint : C.moon, dust, PART.SKIN, random);
    } else if (r < 0.7) { const e = onEllipsoid(BODY, random() < 0.9, random); add(K, e.p, e.n, random() < 0.07 ? C.gold : C.moon, dust, PART.SKIN, random); }
    else if (r < 0.735) { const e = onEllipsoid([0.42 * s, -1.42, 0.22, 0.3, 0.15, 0.24], true, random); add(K, e.p, e.n, C.cream, dust, PART.SKIN, random); }
    else if (r < 0.765) { const e = onEllipsoid([0.82 * s, -0.55, 0.1, 0.17, 0.3, 0.17], true, random); add(K, e.p, e.n, C.moon, rnd(random, 1.4, 3), s < 0 ? PART.ARM_L : PART.ARM_R, random); }
    else if (r < 0.83) add(K, leafPoint(s, 'fill', random), [0, 0, 1], C.leaf, dust, PART.LEAF, random);
    else if (r < 0.875) add(K, leafPoint(s, 'edge', random), [0, 0, 1], C.leafEdge, rnd(random, 1.6, 2.6), PART.LEAF, random);
    else if (r < 0.895) add(K, leafPoint(s, 'vein', random), [0, 0, 1], C.vein, rnd(random, 1.4, 2.2), PART.LEAF, random);
    else if (r < 0.905) { const t = random(); add(K, [0.04 * t, 1.58 + 0.36 * t, 0.02], [0, 0, 1], C.leafEdge, 2, PART.LEAF, random); }
    else if (r < 0.935) { const a = rnd(random, 0, 6.28), d = Math.sqrt(random()); add(K, [0.74 * s + Math.cos(a) * 0.18 * d, 0.2 + Math.sin(a) * 0.1 * d, 0.84], [0, 0, 1], C.cheek, rnd(random, 2, 3.4), PART.FACE, random); }
    else if (r < 0.95) { const a = rnd(random, Math.PI * 1.15, Math.PI * 1.85); add(K, [Math.cos(a) * 0.16, 0.3 + Math.sin(a) * 0.1, 0.95], [0, 0, 1], C.smile, rnd(random, 1.6, 2.6), PART.FACE, random); }
    else {
      const a = rnd(random, 0, 6.28), d = Math.sqrt(random());
      const p = random() < 0.12
        ? [0.42 * s + 0.06 + rnd(random, -0.025, 0.025), 0.72 + rnd(random, -0.025, 0.025), 0.98]
        : [0.42 * s + Math.cos(a) * 0.15 * d, 0.62 + Math.sin(a) * 0.21 * d, 0.94];
      add(K, p, [0, 0, 1], C.eye, rnd(random, 2.2, 4.2), PART.EYE, random);
    }
  }
  for (let i = 0; i < count; i++) {
    const x = K.pos[i * 3], y = K.pos[i * 3 + 1];
    // every point streams in from the side it belongs to
    K.intro.set([(x < 0 ? -1 : 1) * rnd(random, 9, 16), y * 0.6 + rnd(random, -2.2, 2.2), rnd(random, -3, 2)], i * 3);
    const u = rnd(random, -1, 1), th = rnd(random, 0, 6.28), rr = rnd(random, 4, 12), sq = Math.sqrt(1 - u * u);
    K.scatter.set([rr * sq * Math.cos(th) * 1.6, rr * u * 0.8, rr * sq * Math.sin(th) - 3], i * 3);
    const ht = rnd(random, 0, Math.PI * 2), hx = 16 * Math.sin(ht) ** 3, hy = 13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht);
    const spread = 1 + (random() - 0.5) * 0.18 * random();
    K.heart.set([hx * 0.17 * spread + 2.9, hy * 0.17 * spread + 0.6, rnd(random, -0.5, 0.5)], i * 3); // the heart forms on the right, beside its words
  }
  return K;
}
