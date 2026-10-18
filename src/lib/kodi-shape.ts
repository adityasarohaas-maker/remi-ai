// Kodi, the little forest spirit, as particles: where each one sits, its day and night colour,
// its size and its part of the body. The shader (kodi-scene.ts) brings them to life.
// World units: Kodi is about 3.7 tall, feet at y ≈ -1.6, leaf tips at y ≈ 1.9.

export const KODI_GROUP = { HEAD: 0, BODY: 1, EYE: 2, SHINE: 3, CHEEK: 4, MOUTH: 5, LEAF: 6, AURA: 7, ARM_L: 8, ARM_R: 9, HEART: 10 } as const;
const G = KODI_GROUP;

type Ellipse = readonly [cx: number, cy: number, rx: number, ry: number, rot?: number];
const HEAD: Ellipse = [0, 0.35, 1.08, 0.97];
const BODY: Ellipse = [0, -0.98, 0.64, 0.54];
const EYES = [[-0.37, 0.3], [0.37, 0.3]] as const;
const EYE_R = [0.175, 0.225] as const;
const SHINES = [[-0.31, 0.39, 0.068], [0.43, 0.39, 0.068], [-0.42, 0.2, 0.032], [0.32, 0.2, 0.032]] as const;
const CHEEKS = [[-0.68, -0.03], [0.68, -0.03]] as const;
const MOUTH: Ellipse = [0, -0.1, 0.1, 0.055];
const LEAVES: Ellipse[] = [[0.44, 1.7, 0.44, 0.17, 0.42], [-0.38, 1.64, 0.4, 0.155, -0.36]];
const ARM_L: Ellipse = [-0.74, -0.86, 0.2, 0.29, 0.5];
const ARM_R: Ellipse = [0.76, -0.78, 0.2, 0.29, -0.6];
const FEET: Ellipse[] = [[-0.3, -1.5, 0.25, 0.14, 0], [0.3, -1.5, 0.25, 0.14, 0]];
/** Pivots the shader turns parts around. */
export const KODI_PIVOTS = { shoulderL: [-0.55, -0.7], shoulderR: [0.55, -0.66], leafBase: [0, 1.22], neck: [0, -0.5], feet: -1.62 } as const;
const HEART_SPOTS = [[-1.35, 0.9], [1.4, 1.2], [1.15, 0.2]] as const;

function ell(x: number, y: number, [cx, cy, rx, ry, rot = 0]: Ellipse): number {
  const c = Math.cos(-rot), s = Math.sin(-rot), dx = x - cx, dy = y - cy;
  const u = dx * c - dy * s, v = dx * s + dy * c;
  return (u * u) / (rx * rx) + (v * v) / (ry * ry);
}

function classify(x: number, y: number): number {
  for (const [cx, cy, r] of SHINES) if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return G.SHINE;
  for (const [cx, cy] of EYES) if (ell(x, y, [cx, cy, EYE_R[0], EYE_R[1]]) < 1) return G.EYE;
  if (ell(x, y, MOUTH) < 1) return G.MOUTH;
  for (const [cx, cy] of CHEEKS) if (ell(x, y, [cx, cy, 0.17, 0.095]) < 1) return G.CHEEK;
  if (ell(x, y, HEAD) < 1) return G.HEAD;
  for (const l of LEAVES) if (ell(x, y, l) < 1) return G.LEAF;
  if (Math.abs(x - 0.12 * (y - 1.25)) < 0.035 && y > 1.2 && y < 1.62) return G.LEAF; // stem
  if (ell(x, y, BODY) < 1) return G.BODY;
  if (ell(x, y, ARM_L) < 1) return G.ARM_L;
  if (ell(x, y, ARM_R) < 1) return G.ARM_R;
  for (const f of FEET) if (ell(x, y, f) < 1) return G.BODY;
  return -1;
}

function centerOf(g: number, x: number): readonly [number, number] {
  if (g === G.EYE || g === G.SHINE) return x < 0 ? EYES[0] : EYES[1];
  if (g === G.MOUTH) return [MOUTH[0], MOUTH[1]];
  if (g === G.ARM_L) return KODI_PIVOTS.shoulderL;
  if (g === G.ARM_R) return KODI_PIVOTS.shoulderR;
  return [0, 0];
}

type RGB = readonly [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// [day, night]: pastel mint and lavender by day, a white-mint glow by night
const PAL = {
  bodyLight: [hex('#e6f6ea'), hex('#f1fff5')], bodyShade: [hex('#a6d6b4'), hex('#7fe0b0')], rim: [hex('#b39af0'), hex('#c9b8ff')],
  eye: [hex('#1f2f22'), hex('#000000')], shine: [hex('#ffffff'), hex('#ffffff')], cheek: [hex('#f59bbd'), hex('#ff8fbe')],
  mouth: [hex('#3a2433'), hex('#ff7fb3')], leafA: [hex('#5fb57a'), hex('#7dffa4')], leafB: [hex('#9ad9a8'), hex('#c3ffd2')],
  auraA: [hex('#a58cf0'), hex('#d7c9ff')], auraB: [hex('#ffc56b'), hex('#ffe3a3')], heart: [hex('#f2709f'), hex('#ff8fbe')],
} as const;

export type KodiParticles = {
  position: number[]; colorDay: number[]; colorNight: number[]; size: number[]; group: number[]; center: number[]; rand: number[];
};

/** density 1 ≈ 25k particles (a good tablet); 0.5 for small or slow devices. */
export function buildKodi(density: number, random: () => number = Math.random): KodiParticles {
  const k: KodiParticles = { position: [], colorDay: [], colorNight: [], size: [], group: [], center: [], rand: [] };
  const push = (x: number, y: number, z: number, g: number, c: readonly [RGB, RGB], s: number, ctr: readonly [number, number] = centerOf(g, x)) => {
    k.position.push(x, y, z); k.colorDay.push(...c[0]); k.colorNight.push(...c[1]); k.size.push(s); k.group.push(g);
    k.center.push(ctr[0], ctr[1]); k.rand.push(random(), random(), random(), random());
  };
  const shade = (x: number, y: number, rimAmt: number): [RGB, RGB] => {
    const lit = clamp01(0.55 + (0.45 * (-x * 0.5 + y * 0.6)) / 1.1); // light from the top-left
    return [0, 1].map((i) => mix(mix(PAL.bodyShade[i], PAL.bodyLight[i], lit), PAL.rim[i], rimAmt)) as [RGB, RGB];
  };
  const n = (count: number) => Math.round(count * density);

  function sample(count: number, box: readonly [number, number, number, number], want: number[], edgeOnly = false) {
    let made = 0, tries = 0;
    while (made < count && tries < count * 60) {
      tries++;
      const x = box[0] + random() * (box[2] - box[0]), y = box[1] + random() * (box[3] - box[1]);
      const g = classify(x, y);
      if (!want.includes(g)) continue;
      let rimAmt = 0, z = 0;
      if (g === G.HEAD || g === G.EYE || g === G.SHINE || g === G.CHEEK || g === G.MOUTH) {
        const e = ell(x, y, HEAD); z = Math.sqrt(Math.max(0, 1 - e)) * 0.55; rimAmt = Math.pow(e, 6) * 0.9;
      } else if (g === G.BODY) {
        const e = Math.min(1, ell(x, y, BODY)); z = Math.sqrt(Math.max(0, 1 - e)) * 0.35 - 0.05; rimAmt = Math.pow(e, 6) * 0.8;
      } else if (g === G.ARM_L || g === G.ARM_R) {
        rimAmt = Math.pow(Math.min(1, ell(x, y, g === G.ARM_L ? ARM_L : ARM_R)), 3) * 0.85; z = 0.05;
      } else z = (random() - 0.5) * 0.08;
      if (edgeOnly && rimAmt < 0.25) continue; // a second pass on the outline keeps the silhouette crisp
      let c: readonly [RGB, RGB], s: number;
      if (g === G.HEAD || g === G.BODY || g === G.ARM_L || g === G.ARM_R) { c = shade(x, y, rimAmt); s = 1.5 + random() * 1.8; }
      else if (g === G.EYE) { c = PAL.eye; s = 1.7 + random() * 1.1; }
      else if (g === G.SHINE) { c = PAL.shine; s = 1.9 + random() * 1.4; }
      else if (g === G.CHEEK) { c = PAL.cheek; s = 1.7 + random() * 1.5; }
      else if (g === G.MOUTH) { c = PAL.mouth; s = 1.7 + random() * 1.1; }
      else { const t = random(); c = [mix(PAL.leafA[0], PAL.leafB[0], t), mix(PAL.leafA[1], PAL.leafB[1], t)]; s = 1.6 + random() * 1.6; }
      push(x, y, z + (random() - 0.5) * 0.04, g, c, s);
      made++;
    }
  }

  const FULL = [-1.3, -1.75, 1.3, 1.95] as const;
  sample(n(10500), FULL, [G.HEAD]);
  sample(n(3000), FULL, [G.HEAD, G.BODY, G.ARM_L, G.ARM_R], true);
  sample(n(3000), FULL, [G.BODY]);
  sample(n(700), FULL, [G.ARM_L, G.ARM_R]);
  sample(n(2200), [-0.9, 1.15, 1.0, 2.0], [G.LEAF]);
  sample(n(2100), [-0.6, 0.0, 0.6, 0.6], [G.EYE]);
  sample(n(520), [-0.6, 0.1, 0.6, 0.5], [G.SHINE]);
  sample(n(700), [-0.9, -0.2, 0.9, 0.1], [G.CHEEK]);
  sample(n(420), [-0.15, -0.2, 0.15, 0.0], [G.MOUTH]);

  // a loose halo of sparkles
  for (let i = 0; i < n(1500); i++) {
    const a = random() * Math.PI * 2, r = 1.55 + Math.pow(random(), 1.6) * 1.6;
    push(Math.cos(a) * r * 1.05, Math.sin(a) * r + 0.1, (random() - 0.5) * 1.4, G.AURA, random() > 0.8 ? PAL.auraB : PAL.auraA, 1.4 + random() * 2.6);
  }
  // three hearts that float up when Kodi feels loving; each heart's particles share one timing (rand.x)
  HEART_SPOTS.forEach((spot, h) => {
    for (let i = 0; i < Math.max(60, n(260)); i++) {
      const t = random() * Math.PI * 2, fill = Math.sqrt(random());
      const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      push(x * 0.013 * fill, y * 0.013 * fill, 0.3, G.HEART, PAL.heart, 1.8 + random() * 1.4, spot);
      k.rand[k.rand.length - 4] = h / 3;
    }
  });
  return k;
}
