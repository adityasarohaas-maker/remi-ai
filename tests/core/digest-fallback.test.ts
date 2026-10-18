import { describe, it, expect } from 'vitest';
import { factsNote } from '@/core/digest-fallback';
import { summarizeDay } from '@/core/day-summary';

describe('factsNote', () => {
  it('writes the four headings from facts alone', () => {
    const facts = {
      ...summarizeDay('2026-10-17', [], [], 'Asia/Kolkata'),
      conversations: 3,
      moodCounts: { calm: 2, confused: 1 },
      topQuestions: [{ text: 'what day is it', count: 2 }],
      reminders: [
        { time: '08:00', label: 'Morning tablet', kind: 'medicine', state: 'done' as const },
        { time: '13:00', label: 'Lunch', kind: 'meal', state: 'missed' as const },
      ],
      missedMedicines: [],
      alerts: [{ time: '10:05 am', reason: 'help_button', detail: 'Pressed help' }],
    };
    const note = factsNote('Kamla', facts);
    for (const h of ['How the day went', 'Questions asked most', 'Medicines and meals', 'Anything to watch']) expect(note).toContain(h);
    expect(note).toContain('3 times');
    expect(note).toContain('mostly calm');
    expect(note).toContain('“what day is it” (2 times)');
    expect(note).toContain('08:00 Morning tablet: done');
    expect(note).toContain('13:00 Lunch: not yet');
    expect(note).toContain('10:05 am');
  });

  it('says plainly when there is little data', () => {
    const note = factsNote('Kamla', summarizeDay('2026-10-17', [], [], 'Asia/Kolkata'));
    expect(note).toContain('Kamla did not talk to Remi today.');
    expect(note).toContain('Nothing to watch today.');
  });
});
