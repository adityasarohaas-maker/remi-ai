// How much forest a device can carry.
export type ForestTier = 'high' | 'low';

export type TierBudget = {
  kodi: number; trees: number; grass: number; fireflies: number; leaves: number; stars: number;
  pixelRatioCap: number; kodiScale: number;
};

export const TIER_BUDGET: Record<ForestTier, TierBudget> = {
  high: { kodi: 15000, trees: 12, grass: 34000, fireflies: 520, leaves: 260, stars: 2200, pixelRatioCap: 2, kodiScale: 0.8 },
  low: { kodi: 9000, trees: 6, grass: 9000, fireflies: 120, leaves: 80, stars: 800, pixelRatioCap: 1.5, kodiScale: 0.6 },
};

/** Low on phones and small machines; browsers that report neither cores nor memory get the full forest. */
export function pickTier(d: { cores?: number; memoryGB?: number; viewportWidth: number }): ForestTier {
  if (d.viewportWidth < 900) return 'low';
  if (d.cores !== undefined && d.cores < 8) return 'low';
  if (d.memoryGB !== undefined && d.memoryGB < 4) return 'low';
  return 'high';
}
