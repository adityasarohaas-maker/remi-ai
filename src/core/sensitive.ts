import type { Guidance } from './types';

// \p{M} keeps Devanagari vowel signs attached to their letters
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function findSensitiveGuidance(text: string, guidance: Guidance[]): Guidance | null {
  const hay = ` ${normalize(text)} `;
  for (const g of guidance) {
    for (const word of g.triggerWords) {
      const needle = normalize(word);
      if (needle && hay.includes(` ${needle} `)) return g;
    }
  }
  return null;
}
