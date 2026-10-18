import type { DayFacts } from './day-summary';

const STATE_WORD = { upcoming: 'later', due: 'now', done: 'done', missed: 'not yet' } as const;
const REASON_WORD: Record<string, string> = {
  safety: 'safety words heard', call_request: 'asked for a call', help_button: 'pressed “I need help”',
};
const times = (n: number) => (n === 1 ? 'once' : `${n} times`);

// The evening note written from facts alone, for when Nemotron is unavailable.
export function factsNote(preferredName: string, facts: DayFacts): string {
  const moods = Object.entries(facts.moodCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const day = facts.conversations
    ? `${preferredName} talked to Remi ${times(facts.conversations)}${moods.length ? `, mostly ${moods[0][0]}` : ''}.`
    : `${preferredName} did not talk to Remi today.`;
  const faces = facts.recognized.length
    ? ` Remi recognised ${facts.recognized.map((r) => r.name).join(', ')}.`
    : '';

  const questions = facts.topQuestions.length
    ? facts.topQuestions.map((q) => `- “${q.text}” (${times(q.count)})`).join('\n')
    : 'No repeated questions.';

  const routine = facts.reminders.length
    ? facts.reminders.map((r) => `- ${r.time} ${r.label}: ${STATE_WORD[r.state]}`).join('\n')
    : 'No routine set for today.';

  const watch = [
    ...facts.missedMedicines.map((m) => `- ${m} is not marked as taken.`),
    ...facts.alerts.map((a) => `- ${a.time}: ${REASON_WORD[a.reason] ?? a.reason}. ${a.detail}`.trim()),
    ...(facts.unsureFaces ? [`- Remi was unsure who someone was ${times(facts.unsureFaces)}.`] : []),
  ];

  return [
    'How the day went', day + faces, '',
    'Questions asked most', questions, '',
    'Medicines and meals', routine, '',
    'Anything to watch', watch.length ? watch.join('\n') : 'Nothing to watch today.',
  ].join('\n');
}
