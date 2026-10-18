export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function zoned(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute'), s: get('second') };
}

export function partOfDay(hour: number): PartOfDay {
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

export function localParts(date: Date, timeZone: string, locale = 'en-IN') {
  const z = zoned(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    day: `${z.y}-${pad(z.mo)}-${pad(z.d)}`,
    minutes: z.h * 60 + z.mi,
    weekday: new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long' }).format(date),
    prettyDate: new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric', month: 'long', year: 'numeric' }).format(date),
    prettyTime: new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit' }).format(date),
    partOfDay: partOfDay(z.h),
  };
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const z = zoned(date, timeZone);
  return Math.round((Date.UTC(z.y, z.mo - 1, z.d, z.h, z.mi, z.s) - date.getTime()) / 60000);
}

export function dayRangeUtc(day: string, timeZone: string): { start: Date; end: Date } {
  const [y, m, d] = day.split('-').map(Number);
  const at = (dd: number) => {
    const guess = new Date(Date.UTC(y, m - 1, dd));
    return new Date(guess.getTime() - tzOffsetMinutes(guess, timeZone) * 60000);
  };
  return { start: at(d), end: at(d + 1) };
}

export function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
