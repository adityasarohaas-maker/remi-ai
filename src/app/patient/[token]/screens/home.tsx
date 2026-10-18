'use client';
import { useState } from 'react';
import { speak } from '@/lib/speech';
import { labelsFor } from '../labels';
import type { Api } from '../patient-app';
import type { TodayData } from './today';

type Go = (s: 'talk' | 'face' | 'today') => void;

export function Home({ api, preferredName, language, today, go }: { api: Api; preferredName: string; language: string; today: TodayData | null; go: Go }) {
  const t = labelsFor(language);
  const [help, setHelp] = useState<'idle' | 'sending' | string>('idle');
  const part = (today?.now.partOfDay ?? 'morning') as keyof typeof t.greeting;

  async function askForHelp() {
    setHelp('sending');
    try {
      const res = await api('help', { method: 'POST' });
      const data = await res.json();
      const reply = res.ok ? data.reply : t.retry;
      setHelp(reply);
      speak(reply, language);
    } catch {
      setHelp(t.retry);
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-between gap-10 px-6 py-8 sm:px-12 sm:py-12">
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
