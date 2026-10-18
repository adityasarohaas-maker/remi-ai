'use client';
import { useState } from 'react';
import { speak } from '@/lib/speech';
import { labelsFor } from '../labels';
import { RemiOrb } from '../remi-orb';
import { RemiStatusLine } from '../remi-status';
import type { Api } from '../patient-app';
import type { TodayData } from './today';
import type { RemiStatus, Turn } from '../use-remi';

type Go = (s: 'talk' | 'face' | 'today') => void;

export type RemiView = {
  active: boolean; status: RemiStatus; live: string; heard: string; reply: string; turns: Turn[];
  listenNow: () => void; say: (text: string) => void;
};

// Splits Remi's growing reply into sentences, so each new one can fade in without re-animating the rest.
const sentences = (text: string) => text.match(/[^.!?।…]+(?:[.!?।…]+["'”’)]*|$)\s*/g) ?? [];

export function Home({ api, preferredName, language, today, go, remi }: {
  api: Api; preferredName: string; language: string; today: TodayData | null; go: Go; remi: RemiView;
}) {
  const t = labelsFor(language);
  const [help, setHelp] = useState<'idle' | 'sending' | string>('idle');
  const part = (today?.now.partOfDay ?? 'morning') as keyof typeof t.greeting;

  async function askForHelp() {
    setHelp('sending');
    try {
      const res = await api('help', { method: 'POST' });
      const data = await res.json();
      const answer: string = res.ok ? data.reply : t.retry;
      if (remi.active) { remi.say(answer); setHelp('idle'); }
      else { setHelp(answer); speak(answer, language); }
    } catch {
      setHelp(t.retry);
    }
  }

  const last = remi.turns.at(-1);
  const words = remi.live || remi.heard;
  const said = remi.live ? '' : help !== 'idle' && help !== 'sending' ? help : remi.reply;

  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-12 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div>
          <p className="text-2xl sm:text-3xl">{t.greeting[part]}, {preferredName}.</p>
          {today ? (
            <>
              {/* "What day is it?" is the question asked most, so the day stays big and always in view. */}
              <h1 className="mt-1 text-6xl font-bold leading-none tracking-tight text-garden-deep sm:text-7xl">{today.now.weekday}</h1>
              <p className="mt-2 text-2xl tabular-nums text-ink/80 sm:text-3xl">{today.now.prettyDate}, {today.now.prettyTime}</p>
            </>
          ) : (
            <div className="h-[7.5rem] sm:h-[8.5rem]" aria-hidden />
          )}
        </div>
        {remi.active && <RemiStatusLine status={remi.status} language={language} className="sm:pt-2" />}
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center sm:gap-7">
        {last && (
          <p className="line-clamp-2 max-w-2xl text-lg text-ink/45 sm:text-xl" aria-hidden>
            {last.you && <>“{last.you}” · </>}{last.remi}
          </p>
        )}
        <RemiOrb
          status={remi.active ? remi.status : 'off'}
          label={t.orbLabel}
          onPress={remi.active ? remi.listenNow : () => go('talk')}
        />
        <div aria-live="polite" className="flex min-h-[8rem] max-w-3xl flex-col items-center gap-3">
          {words && <p className={`text-xl sm:text-3xl ${remi.live ? 'text-ink/55' : 'text-ink/70'}`}>“{words}”</p>}
          {said ? (
            <p className="text-2xl leading-snug sm:text-4xl">
              {sentences(said).map((s, i) => <span key={i} className="words-in">{s}</span>)}
            </p>
          ) : (
            !words && <p className="text-xl text-ink/55 sm:text-2xl">{remi.active ? t.orbHint : t.orbTapHint}</p>
          )}
        </div>
      </section>

      <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <nav className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
          <button onClick={() => go('face')} className="min-h-14 rounded-full bg-garden px-3 text-lg font-semibold text-paper hover:bg-garden-deep sm:min-h-16 sm:px-7 sm:text-2xl">{t.who}</button>
          <button onClick={() => go('today')} className="min-h-14 rounded-full bg-leaf px-3 text-lg font-semibold text-ink hover:bg-[#cfdac8] sm:min-h-16 sm:px-7 sm:text-2xl">{t.day}</button>
          <button onClick={() => go('talk')} className="min-h-14 rounded-full border-2 border-garden/40 px-3 text-lg font-semibold text-garden-deep hover:bg-leaf sm:min-h-16 sm:px-7 sm:text-2xl">{t.typeIt}</button>
        </nav>
        <button
          onClick={askForHelp}
          disabled={help === 'sending'}
          className="min-h-16 rounded-full border-4 border-alarm bg-white px-9 text-2xl font-semibold text-alarm disabled:opacity-70"
        >
          {help === 'sending' ? t.helpSending : t.help}
        </button>
      </footer>
    </main>
  );
}
