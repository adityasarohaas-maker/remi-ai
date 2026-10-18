import { dayRangeUtc, localParts } from './time';

// Sample events for the demo family: at the given local minutes of today, squeezed
// earlier when it is not yet that late, so nothing is ever in the future.
export function demoMorningTimes(now: Date, timeZone: string, minutes: number[]): Date[] {
  const local = localParts(now, timeZone);
  const { start } = dayRangeUtc(local.day, timeZone);
  const latest = Math.max(...minutes) + 1;
  const scale = Math.min(1, local.minutes / latest);
  return minutes.map((m) => new Date(start.getTime() + Math.floor(m * scale) * 60_000));
}
