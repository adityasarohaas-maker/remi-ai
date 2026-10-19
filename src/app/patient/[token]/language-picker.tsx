'use client';
import { useState } from 'react';
import { LANGUAGES } from '@/core/voices';
import { MAIN_LANGUAGES } from '@/core/i18n';
import { languageName } from '@/core/companion-prompt';
import { labelsFor } from './labels';

const translated = LANGUAGES.filter((l) => (MAIN_LANGUAGES as readonly string[]).includes(l.code.split('-')[0]));
const more = LANGUAGES.filter((l) => !translated.includes(l));
const nativeName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;

/** The 🌐 button and the full-screen list of languages: big buttons, each in its own script. */
export function LanguagePicker({ language, onChange, className = '' }: {
  language: string; onChange: (code: string) => void; className?: string;
}) {
  const t = labelsFor(language);
  const [open, setOpen] = useState(false);
  const choose = (code: string) => { onChange(code); setOpen(false); };

  const option = (l: (typeof LANGUAGES)[number]) => {
    const english = languageName(l.code);
    const selected = l.code === language;
    return (
      <button key={l.code} onClick={() => choose(l.code)} aria-pressed={selected} lang={l.code}
        className={`flex min-h-20 flex-col items-start justify-center rounded-3xl px-5 py-3 text-left shadow-[0_0_0_1px_var(--ring)] ${selected ? 'bg-garden text-paper' : 'bg-surface/80 hover:bg-surface'}`}>
        <span className="font-display text-2xl font-bold leading-tight">{l.name}</span>
        {!l.name.toLowerCase().startsWith(english.toLowerCase()) && <span className={`text-base ${selected ? 'text-paper/80' : 'text-ink/55'}`}>{english}</span>}
      </button>
    );
  };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={t.chooseLanguage}
        className={`flex min-h-12 items-center gap-2 rounded-full bg-surface/70 px-4 font-display text-lg font-semibold shadow-[0_0_0_1px_var(--ring)] backdrop-blur-md hover:bg-surface ${className}`}>
        <span aria-hidden className="text-xl">🌐</span>
        <span lang={language}>{nativeName(language)}</span>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={t.chooseLanguage} className="fixed inset-0 z-40 flex flex-col overflow-y-auto px-4 py-5 sm:px-10 sm:py-8" style={{ background: 'var(--stage)' }}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t.chooseLanguage}</h2>
            <button onClick={() => setOpen(false)} className="min-h-14 rounded-full bg-ink px-7 font-display text-xl font-bold text-paper">{t.close}</button>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{translated.map(option)}</div>
          <h3 className="mt-8 font-display text-2xl font-bold">{t.moreLanguages}</h3>
          <p className="mt-1 text-lg text-ink/60">{t.moreNote}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{more.map(option)}</div>
        </div>
      )}
    </>
  );
}
