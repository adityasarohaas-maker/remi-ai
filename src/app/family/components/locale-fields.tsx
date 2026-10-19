'use client';
import { useEffect, useState } from 'react';
import { LANGUAGES } from '@/core/voices';

const field = 'mt-1 w-full rounded-lg border px-4 py-3';

/**
 * Language and time zone for a family anywhere in the world. A new family starts from their own
 * device's settings; an existing one keeps what it saved.
 */
export function LocaleFields({ language, timezone, locked = false }: { language?: string; timezone?: string; locked?: boolean }) {
  const [lang, setLang] = useState(language ?? 'en-US');
  const [tz, setTz] = useState(timezone ?? 'UTC');
  useEffect(() => {
    if (!language) {
      const nav = navigator.language.toLowerCase();
      const match = LANGUAGES.find((l) => l.code.toLowerCase() === nav) ?? LANGUAGES.find((l) => l.code.split('-')[0] === nav.split('-')[0]);
      if (match) setLang(match.code); // eslint-disable-line react-hooks/set-state-in-effect
    }
    if (!timezone) setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  }, [language, timezone]);
  return (
    <>
      <label className="block">Language Remi speaks
        <select name="language" value={lang} onChange={(e) => setLang(e.target.value)} disabled={locked} className={field}>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
      </label>
      <label className="block">Time zone
        <input name="timezone" value={tz} onChange={(e) => setTz(e.target.value)} disabled={locked} className={field} />
        <span className="mt-1 block text-sm text-stone-500">Where they live, e.g. Asia/Kolkata, Europe/London, America/New_York.</span>
      </label>
    </>
  );
}
