export const EMBEDDING_LENGTH = 1024;

export interface FaceSample { personId: string; embedding: number[] }
export interface MatchOptions { minScore: number; minMargin: number }

// Conservative defaults until calibrated against real enrolled photos (Task 9 Step 6).
export const DEFAULT_MATCH: MatchOptions = { minScore: 0.6, minMargin: 0.06 };

export type MatchResult =
  | { status: 'match'; personId: string; score: number }
  | { status: 'unsure'; bestScore: number }
  | { status: 'no_faces_enrolled' };

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function isValidEmbedding(x: unknown): x is number[] {
  return Array.isArray(x) && x.length === EMBEDDING_LENGTH
    && x.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10);
}

// Never guesses: needs a high score AND a clear lead over the next-best person.
export function matchFace(probe: number[], gallery: FaceSample[], opts: MatchOptions = DEFAULT_MATCH): MatchResult {
  if (!gallery.length) return { status: 'no_faces_enrolled' };
  const best = new Map<string, number>();
  for (const s of gallery) best.set(s.personId, Math.max(best.get(s.personId) ?? -1, cosine(probe, s.embedding)));
  const ranked = [...best.entries()].sort((a, b) => b[1] - a[1]);
  const [topId, topScore] = ranked[0];
  const second = ranked[1]?.[1] ?? -1;
  if (topScore >= opts.minScore && topScore - second >= opts.minMargin) return { status: 'match', personId: topId, score: topScore };
  return { status: 'unsure', bestScore: topScore };
}
