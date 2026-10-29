// A cloud of glowing points, and the few shapes everything in the forest is made of.
export type Cloud = {
  n: number; i: number;
  pos: Float32Array; normal: Float32Array; color: Float32Array; size: Float32Array; seed: Float32Array; part: Float32Array;
  scatter: Float32Array | null; heart: Float32Array | null; intro: Float32Array | null;
};

/** What a point belongs to; the shader moves and lights each part differently. */
export const PART = {
  SKIN: 0, LEAF: 1, FACE: 2, ARM_L: 3, ARM_R: 4, EYE: 5,
  TREE: 6, GRASS: 7, FALLING_LEAF: 8, FIREFLY: 9, ANIMAL: 10, MUSHROOM: 11,
} as const;

export function cloud(n: number): Cloud {
  return {
    n, i: 0, pos: new Float32Array(n * 3), normal: new Float32Array(n * 3), color: new Float32Array(n * 3),
    size: new Float32Array(n), seed: new Float32Array(n), part: new Float32Array(n), scatter: null, heart: null, intro: null,
  };
}

export function add(c: Cloud, p: number[], n: number[], col: number[], size: number, part: number, random: () => number): void {
  if (c.i >= c.n) return;
  const i = c.i++;
  c.pos.set(p, i * 3); c.normal.set(n, i * 3); c.color.set(col, i * 3);
  c.size[i] = size; c.seed[i] = random() * 100; c.part[i] = part;
}

export const rnd = (random: () => number, a: number, b: number): number => a + random() * (b - a);

/** A point on (or just inside) an ellipsoid [cx, cy, cz, rx, ry, rz], with its outward normal. */
export function onEllipsoid(c: number[], surface: boolean, random: () => number): { p: number[]; n: number[] } {
  const [cx, cy, cz, rx, ry, rz] = c, u = rnd(random, -1, 1), th = rnd(random, 0, Math.PI * 2), s = Math.sqrt(1 - u * u);
  const k = surface ? 1 - random() * 0.03 : Math.pow(random(), 0.4);
  const d = [s * Math.cos(th), u, s * Math.sin(th)];
  const n = [d[0] / rx, d[1] / ry, d[2] / rz], l = Math.hypot(n[0], n[1], n[2]);
  return { p: [cx + rx * d[0] * k, cy + ry * d[1] * k, cz + rz * d[2] * k], n: n.map((v) => v / l) };
}

export const mixc = (a: number[], b: number[], t: number): number[] => a.map((v, i) => v + (b[i] - v) * t);
