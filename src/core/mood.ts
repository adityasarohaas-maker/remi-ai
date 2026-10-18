import { stripReasoning } from './text';

export const MOODS = ['calm', 'happy', 'confused', 'anxious', 'sad', 'agitated'] as const;
export type Mood = (typeof MOODS)[number] | 'unknown';

// Hidden lines usually come on their own line, but models sometimes tack them onto the last sentence.
const MOOD_TAG = /\[?\s*mood\s*:\s*([a-z]+)\s*\]?\s*$/i;
const TELL_TAG = /\[?\s*tell_family\s*:\s*(.*?)\s*\]?\s*$/i;

/** Splits a line at a hidden tag: the spoken part before it, and the tag's value. */
function splitTag(line: string, tag: RegExp): { before: string; value: string } | null {
  const m = line.match(tag);
  if (!m || m.index === undefined) return null;
  return { before: line.slice(0, m.index).trim(), value: m[1].trim() };
}

export function parseMoodTag(raw: string): { reply: string; mood: Mood } {
  let mood: Mood = 'unknown';
  const kept: string[] = [];
  for (const line of stripReasoning(raw).split('\n')) {
    const t = splitTag(line, MOOD_TAG);
    if (t) {
      const word = t.value.toLowerCase();
      mood = (MOODS as readonly string[]).includes(word) ? (word as Mood) : 'unknown';
      if (t.before) kept.push(t.before);
    } else kept.push(line);
  }
  return { reply: kept.join('\n').trim(), mood };
}

/** Remi's one action: a short message for the family, on a TELL_FAMILY: line. Never spoken aloud. */
export function extractTellFamily(reply: string): { reply: string; message: string | null } {
  let message: string | null = null;
  const kept: string[] = [];
  for (const line of reply.split('\n')) {
    const t = splitTag(line, TELL_TAG);
    if (t) {
      message = t.value || null;
      if (t.before) kept.push(t.before);
    } else kept.push(line);
  }
  return { reply: kept.join('\n').trim(), message };
}
