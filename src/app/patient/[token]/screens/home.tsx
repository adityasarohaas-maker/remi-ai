'use client';
import { useState, type ReactNode } from 'react';
import { speak } from '@/lib/speech';
import type { KodiCue, KodiEmotion, KodiEvent } from '@/core/kodi';
import { labelsFor } from '../labels';
import { RemiStatusLine } from '../remi-status';
import { Kodi } from '../kodi/kodi';
import { LanguagePicker } from '../language-picker';
import type { Api } from '../patient-app';
import type { TodayData } from './today';
import type { RemiStatus, Turn } from '../use-remi';

type Go = (s: 'talk' | 'face' | 'today') => void;

export type RemiView = {
  active: boolean; status: RemiStatus; live: string; heard: string; reply: string; turns: Turn[];
  listenNow: () => void; say: (text: string) => void; feel: (i: { event: KodiEvent }) => void;
};

// Splits Remi's growing reply into sentences, so each new one can fade in without re-animating the rest.
const sentences = (text: string) => text.match(/[^.!?।…]+(?:[.!?।…]+["'”’)]*|$)\s*/g) ?? [];

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);
const ICONS = {
  who: icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
  day: icon(<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>),
  type: icon(<><rect x="2" y="6" width="20" height="13" rx="3" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 15h10" /></>),
};

/** A soft card after the reference design: icon tile, title, round arrow. */
function ActionCard({ onClick, label, glyph }: { onClick: () => void; label: string; glyph: ReactNode }) {
  return (
    <button onClick={onClick}
      className="group flex min-h-16 flex-col items-center justify-center gap-1 rounded-3xl bg-surface/70 p-2 text-center shadow-[0_0_0_1px_var(--ring),0_18px_40px_-28px_rgb(60_30_140/0.55)] backdrop-blur-md hover:bg-surface sm:flex-row sm:justify-start sm:gap-4 sm:p-4 sm:text-left">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-garden text-paper sm:size-12">{glyph}</span>
      <span className="font-display text-base font-semibold leading-tight sm:flex-1 sm:text-2xl">{label}</span>
      <span aria-hidden className="hidden size-10 shrink-0 place-items-center rounded-full bg-leaf text-xl text-garden-deep group-hover:translate-x-0.5 rtl:-scale-x-100 sm:grid">→</span>
    </button>
  );
}

export function Home({ api, preferredName, language, today, go, remi, kodi, onLanguage }: {
  api: Api; preferredName: string; language: string; today: TodayData | null; go: Go; remi: RemiView;
  kodi: { emotion: KodiEmotion; cue: KodiCue; night: boolean }; onLanguage: (code: string) => void;
}) {
  const t = labelsFor(language);
  const [help, setHelp] = useState<'idle' | 'sending' | string>('idle');
  const part = (today?.now.partOfDay ?? 'morning') as keyof typeof t.greeting;

  async function askForHelp() {
    setHelp('sending');
    remi.feel({ event: 'help' });
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
  // while she speaks, only her live words show: Remi's previous reply would read as an answer to them
  const said = remi.live ? '' : help !== 'idle' && help !== 'sending' ? help : remi.reply;

  return (
    <main className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-10 sm:py-6">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-x-8 gap-y-2">
        <div className="font-display">
          <p className="text-2xl font-medium text-ink/65 sm:text-3xl">{t.greeting[part]}, {preferredName}.</p>
          {today ? (
            <>
              {/* "What day is it?" is the question asked most, so the day stays big and always in view. */}
              <h1 className="mt-1 text-5xl font-extrabold leading-none tracking-tight sm:text-7xl">{today.now.weekday}</h1>
              <p className="mt-2 font-sans text-xl tabular-nums text-ink/65 sm:text-3xl">{today.now.prettyDate}, {today.now.prettyTime}</p>
            </>
          ) : (
            <div className="h-[7.5rem] sm:h-[8.5rem]" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {remi.active && (
            <RemiStatusLine status={remi.status} language={language} className="rounded-full bg-surface/70 px-4 py-2 shadow-[0_0_0_1px_var(--ring)] backdrop-blur-md" />
          )}
          <LanguagePicker language={language} onChange={onLanguage} />
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col items-center text-center">
        <Kodi
          className="min-h-[8rem] w-full max-w-xl flex-1"
          state={remi.active ? remi.status : 'listening'}
          emotion={kodi.emotion}
          cue={kodi.cue}
          night={kodi.night}
          label={t.orbLabel}
          onPress={remi.active ? remi.listenNow : () => go('talk')}
        />
        {last && (
          <p className="line-clamp-1 max-w-2xl text-lg text-ink/40 sm:text-xl" aria-hidden>
            {last.you && <>“{last.you}” · </>}{last.remi}
          </p>
        )}
        <div aria-live="polite" className="flex max-w-3xl shrink-0 flex-col items-center justify-start gap-1 pt-1 sm:min-h-[6rem] sm:gap-2">
          {words && <p className={`text-lg sm:text-2xl ${remi.live ? 'text-ink/50' : 'text-ink/65'}`}>“{words}”</p>}
          {said ? (
            <p className="font-display text-xl font-semibold leading-snug tracking-tight sm:text-3xl">
              {sentences(said).map((s, i) => <span key={i} className="words-in">{s}</span>)}
            </p>
          ) : (
            !words && <p className="text-xl text-ink/50 sm:text-2xl">{remi.active ? t.orbHint : t.orbTapHint}</p>
          )}
        </div>
      </section>

      <footer className="flex shrink-0 flex-col gap-2 pt-3 sm:flex-row sm:items-stretch sm:gap-4">
        <nav className="grid flex-1 grid-cols-3 gap-2 sm:gap-4">
          <ActionCard onClick={() => go('face')} label={t.who} glyph={ICONS.who} />
          <ActionCard onClick={() => go('today')} label={t.day} glyph={ICONS.day} />
          <ActionCard onClick={() => go('talk')} label={t.typeIt} glyph={ICONS.type} />
        </nav>
        <button
          onClick={askForHelp}
          disabled={help === 'sending'}
          className="min-h-14 rounded-3xl border-4 border-alarm bg-surface px-8 font-display text-2xl font-bold text-alarm shadow-sm disabled:opacity-70 sm:min-h-16 sm:min-w-56"
        >
          {help === 'sending' ? t.helpSending : t.help}
        </button>
      </footer>
    </main>
  );
}
