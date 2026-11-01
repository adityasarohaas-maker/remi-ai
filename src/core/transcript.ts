// What the family may read of what she said to Remi.

export type TranscriptEvent = { id: number; created_at: string; payload: Record<string, unknown> };

/**
 * Only turns Remi has already gone through, because any turn may hold something she wants kept. Sealed turns
 * stay out, and so do turns the extraction skipped, since nobody has read those for what she asked to keep.
 */
export function showableTurns<E extends TranscriptEvent>(events: E[], extractedThrough: number): E[] {
  return events.filter((e) => e.id <= extractedThrough && !e.payload.sealed && !e.payload.fallback);
}
