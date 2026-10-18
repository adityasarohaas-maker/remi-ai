'use client';
import { labelsFor } from '../labels';

export type TodayData = {
  now: { weekday: string; prettyDate: string; prettyTime: string; partOfDay: string; night?: boolean };
  items: { id: string; label: string; kind: string; minutes: number; state: 'upcoming' | 'due' | 'done' | 'missed'; spokenMessage: string | null }[];
};

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

const BADGE: Record<TodayData['items'][number]['state'], string> = {
  done: 'bg-leaf text-garden-deep',
  due: 'bg-marigold text-ink',
  missed: 'bg-surface text-ink border-2 border-ink/40',
  upcoming: 'bg-surface/60 text-ink/70',
};

export function Today({ today, language, markDone, back }: { today: TodayData | null; language: string; markDone: (id: string) => void; back: () => void }) {
  const t = labelsFor(language);
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8 sm:px-12">
      <button onClick={back} className="self-start rounded-xl px-2 text-2xl underline underline-offset-4">← {t.back}</button>
      {today && <h1 className="text-5xl font-bold text-garden-deep">{today.now.weekday}</h1>}
      <ol className="flex flex-col gap-3">
        {(today?.items ?? []).map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl bg-surface px-6 py-5">
            <span className="w-36 text-3xl tabular-nums text-ink/80">{clock(item.minutes)}</span>
            <span className="grow text-3xl font-semibold">{item.label}</span>
            <span className={`rounded-full px-5 py-2 text-2xl ${BADGE[item.state]}`}>{t.state[item.state]}</span>
            {(item.state === 'due' || item.state === 'missed') && (
              <button onClick={() => markDone(item.id)} className="min-h-16 rounded-2xl bg-garden px-8 text-2xl font-semibold text-paper">{t.done}</button>
            )}
          </li>
        ))}
        {today && !today.items.length && <li className="text-3xl text-ink/70">{t.nothingToday}</li>}
      </ol>
    </main>
  );
}
