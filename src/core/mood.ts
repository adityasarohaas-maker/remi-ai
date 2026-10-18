import { stripReasoning } from './text';

export const MOODS = ['calm', 'happy', 'confused', 'anxious', 'sad', 'agitated'] as const;
export type Mood = (typeof MOODS)[number] | 'unknown';

const TAG = /^\s*\[?\s*mood\s*:\s*([a-z]+)\s*\]?\s*$/i;

export function parseMoodTag(raw: string): { reply: string; mood: Mood } {
  let mood: Mood = 'unknown';
  const kept: string[] = [];
  for (const line of stripReasoning(raw).split('\n')) {
    const m = line.match(TAG);
    if (m) {
      const word = m[1].toLowerCase();
      mood = (MOODS as readonly string[]).includes(word) ? (word as Mood) : 'unknown';
    } else kept.push(line);
  }
  return { reply: kept.join('\n').trim(), mood };
}

const TELL = /^\s*\[?\s*tell_family\s*:\s*(.*?)\s*\]?\s*$/i;

/** Remi's one action: a short message for the family, on its own TELL_FAMILY: line. Never spoken aloud. */
export function extractTellFamily(reply: string): { reply: string; message: string | null } {
  let message: string | null = null;
  const kept: string[] = [];
  for (const line of reply.split('\n')) {
    const m = line.match(TELL);
    if (m) message = m[1].trim() || null;
    else kept.push(line);
  }
  return { reply: kept.join('\n').trim(), message };
}
