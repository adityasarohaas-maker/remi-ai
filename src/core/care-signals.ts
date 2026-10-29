// Things worth a look from the family or the care team: not emergencies (safety.ts), but signs that
// something is wrong and building. Plain word lists in English, plus how she has been seeming.
import type { Mood } from './mood';

export const CARE_KINDS = ['pain', 'breath', 'distress', 'fear', 'confusion', 'appetite'] as const;
export type CareKind = (typeof CARE_KINDS)[number];

export const CARE_ALERTS_PER_KIND = 2;
export const CARE_ALERT_WINDOW_SECONDS = 6 * 3600;
/** Confused this many times in one session before it counts as a signal. */
export const CONFUSION_STREAK = 3;

const WORDS: Record<Exclude<CareKind, 'confusion'>, RegExp> = {
  pain: /\b(?:hurts?|hurting|pain|painful|aches?|aching|sore|throbbing|agony)\b/i,
  breath: /\b(?:can't breathe|cannot breathe|breathless|short of breath|out of breath|wheezing|gasping|chest is tight)\b/i,
  distress: /\b(?:crying|can't take it|cannot take it|want it to end|can't go on|cannot go on|give up|no point|hopeless)\b/i,
  fear: /\b(?:scared|afraid|frightened|terrified|petrified)\b/i,
  appetite: /\b(?:not hungry|didn't eat|did not eat|haven't eaten|have not eaten|can't eat|cannot eat|no appetite|skipped (?:lunch|dinner|breakfast))\b/i,
};

export const CARE_LABEL: Record<CareKind, string> = {
  pain: 'Mentioned pain', breath: 'Short of breath', distress: 'In distress', fear: 'Frightened',
  confusion: 'Confusion building', appetite: 'Not eating',
};

export function detectCareSignals(text: string, mood: Mood, recentConfusedCount: number): CareKind[] {
  const found: CareKind[] = [];
  for (const kind of ['pain', 'breath', 'distress', 'fear', 'appetite'] as const) {
    if (WORDS[kind].test(text)) found.push(kind);
  }
  if (mood === 'confused' && recentConfusedCount >= CONFUSION_STREAK) found.push('confusion');
  return found;
}
