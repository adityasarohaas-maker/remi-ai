import { localParts, type PartOfDay } from './time';
import type { RoutineWithState, ReminderState } from './reminders';
import type { Mood } from './mood';

export interface DayEvent { type: string; payload: Record<string, unknown>; created_at: string }
export interface DayFacts {
  day: string;
  conversations: number;
  fallbacks: number;
  moodCounts: Partial<Record<Mood, number>>;
  moodByPart: Partial<Record<PartOfDay, Mood>>;
  topQuestions: { text: string; count: number }[];
  sensitiveTopics: { topic: string; count: number }[];
  reminders: { time: string; label: string; kind: string; state: ReminderState }[];
  missedMedicines: string[];
  alerts: { time: string; reason: string; detail: string }[];
  recognized: { name: string; count: number }[];
  unsureFaces: number;
}

// (?=\s|$) instead of \b: JS \b does not treat Devanagari as word characters
const QUESTION_START = /^(what|when|where|who|why|how|is|are|am|can|will|did|do|does|kya|kab|kahan|kaun|kyun|kaise|क्या|कब|कहाँ|कौन|क्यों|कैसे)(?=\s|$)/i;
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const isQuestion = (s: string) => /[?？]\s*$/.test(s) || QUESTION_START.test(s.trim());

function tally(keys: string[]): { key: string; count: number }[] {
  const m = new Map<string, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export function summarizeDay(day: string, events: DayEvent[], reminders: RoutineWithState[], timeZone: string): DayFacts {
  const convo = events.filter((e) => e.type === 'conversation');
  const moodCounts: Partial<Record<Mood, number>> = {};
  const byPart: Partial<Record<PartOfDay, Mood[]>> = {};
  for (const e of convo) {
    const mood = (e.payload.mood as Mood | undefined) ?? 'unknown';
    if (mood === 'unknown') continue;
    moodCounts[mood] = (moodCounts[mood] ?? 0) + 1;
    const part = localParts(new Date(e.created_at), timeZone).partOfDay;
    (byPart[part] ??= []).push(mood);
  }
  const moodByPart: Partial<Record<PartOfDay, Mood>> = {};
  for (const [part, moods] of Object.entries(byPart) as [PartOfDay, Mood[]][]) moodByPart[part] = tally(moods)[0].key as Mood;

  const faces = events.filter((e) => e.type === 'face_query');
  return {
    day,
    conversations: convo.length,
    fallbacks: convo.filter((e) => e.payload.fallback === true).length,
    moodCounts,
    moodByPart,
    topQuestions: tally(convo.map((e) => String(e.payload.text ?? '')).filter(isQuestion).map(norm))
      .slice(0, 5).map(({ key, count }) => ({ text: key, count })),
    sensitiveTopics: tally(convo.map((e) => e.payload.sensitiveTopic).filter((t): t is string => typeof t === 'string'))
      .map(({ key, count }) => ({ topic: key, count })),
    reminders: reminders.map((r) => ({ time: r.timeOfDay.slice(0, 5), label: r.label, kind: r.kind, state: r.state })),
    missedMedicines: reminders.filter((r) => r.kind === 'medicine' && r.state === 'missed').map((r) => r.label),
    alerts: events.filter((e) => e.type === 'alert').map((e) => ({
      time: localParts(new Date(e.created_at), timeZone).prettyTime,
      reason: String(e.payload.reason ?? ''),
      detail: String(e.payload.detail ?? ''),
    })),
    recognized: tally(faces.filter((e) => e.payload.status === 'match').map((e) => String(e.payload.name)))
      .map(({ key, count }) => ({ name: key, count })),
    unsureFaces: faces.filter((e) => e.payload.status === 'unsure').length,
  };
}
