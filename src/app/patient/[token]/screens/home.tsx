'use client';
import { useState } from 'react';
import { speak } from '@/lib/speech';
import { labelsFor } from '../labels';
import type { Api } from '../patient-app';
import type { TodayData } from './today';

type Go = (s: 'talk' | 'face' | 'today') => void;

type Props = {
  api: Api; preferredName: string; language: string; today: TodayData | null; go: Go;
  /** Remi's voice when hands-free is on, so Remi does not hear itself. */
  say?: (text: string) => void;
  heard?: string; reply?: string;
};

export function Home({ api, preferredName, language, today, go, say, heard, reply }: Props) {
  const t = labelsFor(language);
  const [help, setHelp] = useState<'idle' | 'sending' | string>('idle');
  const part = (today?.now.partOfDay ?? 'morning') as keyof typeof t.greeting;

  async function askForHelp() {
    setHelp('sending');
    try {
      const res = await api('help', { method: 'POST' });
      const data = await res.json();
      const answer = res.ok ? data.reply : t.retry;
      setHelp(answer);
      (say ?? ((x: string) => speak(x, language)))(answer);
    } catch {
      setHelp(t.retry);
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-between gap-10 px-6 py-8 sm:px-12 sm:py-12">
      {/* On a tablet, Remi's words sit beside the date so the help button never leaves the screen. */}
      <div className="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-16">
      <header>
        <p className="text-3xl sm:text-4xl">{t.greeting[part]}, {preferredName}.</p>
        {today ? (
          <>
            {/* The question asked most is "what day is it?" — so the day is the biggest thing on screen. */}
            <h1 className="mt-4 text-7xl font-bold leading-none tracking-tight text-garden-deep sm:text-9xl">{today.now.weekday}</h1>
            <p className="mt-4 text-3xl sm:text-5xl">{today.now.prettyDate}</p>
            <p className="mt-2 text-3xl tabular-nums text-ink/80 sm:text-5xl">{today.now.prettyTime}</p>
          </>
        ) : (
          <div className="mt-4 h-[11rem] sm:h-[16rem]" aria-hidden />
        )}
      </header>

      {reply && (
        <section aria-live="polite" className="settle max-w-4xl rounded-[2rem] bg-white p-6 sm:p-8" key={reply}>
          {heard && <p className="text-2xl text-ink/70 sm:text-3xl">“{heard}”</p>}
          <p className="mt-2 text-3xl leading-snug sm:text-4xl"><span className="font-semibold text-garden-deep">{t.remiSaid}:</span> {reply}</p>
        </section>
      )}
      </div>

      <nav className="grid gap-4 sm:grid-cols-3">
        <button onClick={() => go('talk')} className="min-h-28 rounded-3xl bg-garden px-6 text-3xl font-semibold text-paper hover:bg-garden-deep sm:min-h-40 sm:text-4xl">{t.talk}</button>
        <button onClick={() => go('face')} className="min-h-28 rounded-3xl bg-garden px-6 text-3xl font-semibold text-paper hover:bg-garden-deep sm:min-h-40 sm:text-4xl">{t.who}</button>
        <button onClick={() => go('today')} className="min-h-28 rounded-3xl bg-leaf px-6 text-3xl font-semibold text-ink hover:bg-[#cfdac8] sm:min-h-40 sm:text-4xl">{t.day}</button>
      </nav>

      <footer className="flex flex-col items-start gap-4">
        <button
          onClick={askForHelp}
          disabled={help === 'sending'}
          className="min-h-20 rounded-full border-4 border-alarm bg-white px-10 text-2xl font-semibold text-alarm disabled:opacity-70 sm:text-3xl"
        >
          {help === 'sending' ? t.helpSending : t.help}
        </button>
        {help !== 'idle' && help !== 'sending' && <p className="settle max-w-3xl text-3xl" aria-live="polite">{help}</p>}
      </footer>
    </main>
  );
}
