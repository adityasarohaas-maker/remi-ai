// Marking her passed changes what the family sees and opens what she sealed for after. It is meant to be final.
export const UNDO_HOURS = 24;

/** A change of heart is allowed for a day, unless something sealed has already opened. The demo family can always go back. */
export function canUndoPassed(
  h: { status: 'living' | 'passed'; passed_marked_at: string | null; is_demo: boolean },
  anyOpenedSince: boolean,
  now: Date,
): boolean {
  if (h.is_demo) return true;
  if (h.status !== 'passed' || !h.passed_marked_at) return false;
  if (anyOpenedSince) return false;
  return now.getTime() - new Date(h.passed_marked_at).getTime() < UNDO_HOURS * 3600 * 1000;
}
