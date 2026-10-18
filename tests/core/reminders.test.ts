import { describe, it, expect } from 'vitest';
import { reminderStates } from '@/core/reminders';
import type { RoutineItem } from '@/core/types';

const items: RoutineItem[] = [
  { id: 'lunch', timeOfDay: '13:00', kind: 'meal', label: 'Lunch', spokenMessage: null },
  { id: 'med1', timeOfDay: '08:00:00', kind: 'medicine', label: 'Morning tablet', spokenMessage: null },
  { id: 'med2', timeOfDay: '12:30', kind: 'medicine', label: 'BP tablet', spokenMessage: null },
];

describe('reminderStates', () => {
  it('marks done, missed, due, upcoming and sorts by time', () => {
    const now = 13 * 60 + 10; // 13:10
    const r = reminderStates(items, ['med1'], now);
    expect(r.map((x) => [x.id, x.state])).toEqual([
      ['med1', 'done'],
      ['med2', 'due'],
      ['lunch', 'due'],
    ]);
  });
  it('becomes missed after the grace period', () => {
    const r = reminderStates(items, [], 9 * 60 + 1);
    expect(r.find((x) => x.id === 'med1')!.state).toBe('missed');
    expect(r.find((x) => x.id === 'lunch')!.state).toBe('upcoming');
  });
});
