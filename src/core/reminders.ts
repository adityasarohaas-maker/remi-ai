import type { RoutineItem } from './types';
import { parseHHMM } from './time';

export type ReminderState = 'upcoming' | 'due' | 'done' | 'missed';
export type RoutineWithState = RoutineItem & { minutes: number; state: ReminderState };

export function reminderStates(items: RoutineItem[], doneIds: string[], nowMinutes: number, graceMinutes = 60): RoutineWithState[] {
  const done = new Set(doneIds);
  return items
    .map((item) => {
      const minutes = parseHHMM(item.timeOfDay);
      let state: ReminderState;
      if (done.has(item.id)) state = 'done';
      else if (nowMinutes < minutes) state = 'upcoming';
      else if (nowMinutes < minutes + graceMinutes) state = 'due';
      else state = 'missed';
      return { ...item, minutes, state };
    })
    .sort((a, b) => a.minutes - b.minutes);
}
