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
