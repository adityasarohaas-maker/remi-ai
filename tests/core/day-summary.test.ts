import { describe, it, expect } from 'vitest';
import { summarizeDay } from '@/core/day-summary';
import type { RoutineWithState } from '@/core/reminders';

const ev = (type: string, payload: Record<string, unknown>, utc: string) => ({ type, payload, created_at: utc });
const events = [
  ev('conversation', { text: 'What day is it?', mood: 'calm' }, '2026-10-17T03:00:00Z'), // 08:30 IST
  ev('conversation', { text: 'what day is it', mood: 'confused' }, '2026-10-17T04:00:00Z'),
  ev('conversation', { text: 'When is lunch?', mood: 'calm' }, '2026-10-17T06:00:00Z'),
  ev('conversation', { text: 'Where is Ramesh?', mood: 'sad', sensitiveTopic: 'Husband Ramesh' }, '2026-10-17T13:00:00Z'), // 18:30
  ev('conversation', { text: 'I like the garden', mood: 'happy', fallback: true }, '2026-10-17T13:10:00Z'),
  ev('alert', { reason: 'safety', detail: 'Avni said: "I fell"' }, '2026-10-17T13:20:00Z'),
  ev('face_query', { status: 'match', name: 'Rohan' }, '2026-10-17T07:00:00Z'),
  ev('face_query', { status: 'unsure' }, '2026-10-17T07:05:00Z'),
];
const reminders: RoutineWithState[] = [
  { id: 'm1', timeOfDay: '08:00', kind: 'medicine', label: 'Morning tablet', spokenMessage: null, minutes: 480, state: 'done' },
  { id: 'm2', timeOfDay: '20:00', kind: 'medicine', label: 'Night tablet', spokenMessage: null, minutes: 1200, state: 'missed' },
];

describe('summarizeDay', () => {
  const f = summarizeDay('2026-10-17', events, reminders, 'Asia/Kolkata');
  it('counts conversations and fallbacks', () => {
    expect(f.conversations).toBe(5);
    expect(f.fallbacks).toBe(1);
  });
  it('detects Hindi questions without a question mark', () => {
    const h = summarizeDay('2026-10-17', [ev('conversation', { text: 'क्या समय हुआ', mood: 'calm' }, '2026-10-17T03:00:00Z')], [], 'Asia/Kolkata');
    expect(h.topQuestions).toEqual([{ text: 'क्या समय हुआ', count: 1 }]);
  });
  it('merges repeated questions regardless of case/punctuation', () => {
    expect(f.topQuestions[0]).toEqual({ text: 'what day is it', count: 2 });
    expect(f.topQuestions.map((q) => q.text)).not.toContain('i like the garden');
  });
  it('drops questions that are only punctuation', () => {
    const f = summarizeDay('2026-10-17', [ev('conversation', { text: '?? ??? ?' }, '2026-10-17T03:00:00Z')], [], 'Asia/Kolkata');
    expect(f.topQuestions).toEqual([]);
  });

  it('tracks mood by part of day in the household time zone', () => {
    expect(f.moodCounts).toEqual({ calm: 2, confused: 1, sad: 1, happy: 1 });
    expect(f.moodByPart.morning).toBe('calm');
    expect(f.moodByPart.evening).toBeDefined();
  });
  it('lists missed medicines, alerts, sensitive topics and faces', () => {
    expect(f.missedMedicines).toEqual(['Night tablet']);
    expect(f.alerts).toHaveLength(1);
    expect(f.alerts[0].reason).toBe('safety');
    expect(f.sensitiveTopics).toEqual([{ topic: 'Husband Ramesh', count: 1 }]);
    expect(f.recognized).toEqual([{ name: 'Rohan', count: 1 }]);
    expect(f.unsureFaces).toBe(1);
  });
});
