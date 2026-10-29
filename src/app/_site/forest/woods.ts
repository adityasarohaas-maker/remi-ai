// The faraway tree line: one layer of moonlit silhouettes, drawn once as SVG, hazy with distance.
// Everything nearer is living light in the WebGL scene. Ported from the prototype's buildWoods.
import { mulberry32 } from '@/lib/seeded';

const L = { base: 532, h: [60, 130], w: [34, 70], n: 40, fill: '#131F3C', rim: '#22385E', gap: 120, fog: '#1A2B4A' };

export function woodsSvg(seed: number): string {
  const random = mulberry32(seed);
  const rnd = (a: number, b: number) => a + random() * (b - a);
  let shapes = '';
  for (let i = 0; i < L.n; i++) {
    const x = (i + random() * 0.8) * (1600 / L.n) - 80;
    if (Math.abs(x - 720) < L.gap) continue; // keep the sky clear behind Kodi
    const h = rnd(L.h[0], L.h[1]), w = rnd(L.w[0], L.w[1]), b = L.base + rnd(-6, 6);
    let d = '';
    if (random() < 0.45) { // a pine: stacked tiers
      const tiers = 4 + Math.floor(random() * 3);
      for (let k = 0; k < tiers; k++) {
        const ty = b - h * (0.18 + 0.82 * k / tiers), tw = w * (1 - k / (tiers + 0.6)) * 0.6, th = h * 0.32;
        d += `M${x - tw} ${ty} L${x} ${ty - th} L${x + tw} ${ty} Z `;
      }
      d += `M${x - w * 0.05} ${b} h${w * 0.1} v${-h * 0.22} h${-w * 0.1} Z`;
    } else { // a broad tree: a few overlapping crowns on a trunk
      d += `M${x - w * 0.07} ${b} h${w * 0.14} v${-h * 0.55} h${-w * 0.14} Z `;
      const crowns = 4 + Math.floor(random() * 3);
      for (let k = 0; k < crowns; k++) {
        const cx = x + rnd(-0.35, 0.35) * w, cy = b - h * rnd(0.55, 0.92), r = w * rnd(0.28, 0.42);
        d += `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `;
      }
    }
    shapes += `<path d="${d}" fill="url(#f-lit)"/>`;
  }
  // moonlight from above: the trees are lighter at the top, and mist gathers at their feet
  const defs = `<defs>
    <linearGradient id="f-lit" x1="0.7" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${L.rim}"/><stop offset="0.45" stop-color="${L.fill}"/></linearGradient>
    <linearGradient id="f-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.fog}" stop-opacity="0"/><stop offset="1" stop-color="${L.fog}" stop-opacity="0.9"/></linearGradient>
  </defs>`;
  shapes += `<rect x="-200" y="${L.base - 70}" width="1840" height="78" fill="url(#f-fog)"/>`;
  return defs + shapes;
}
