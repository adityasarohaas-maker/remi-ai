'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { speak } from '@/lib/speech';
import { labelsFor } from './labels';
import { useRemi, type RemiPerson } from './use-remi';
import { Kodi } from './kodi/kodi';
import { isNightTheme } from '@/core/kodi';
import { RemiStatusLine } from './remi-status';
import { Home } from './screens/home';
import { Talk } from './screens/talk';
import { Face } from './screens/face';
import { Today, type TodayData } from './screens/today';

export type Api = (path: string, init?: RequestInit) => Promise<Response>;
type Screen = 'home' | 'talk' | 'face' | 'today';

export function PatientApp({ token, preferredName, language, people, theme }: {
  token: string; preferredName: string; language: string; people: RemiPerson[]; theme?: 'day' | 'night';
}) {
  const t = labelsFor(language);
  const [screen, setScreen] = useState<Screen>('home');
  const [autoLook, setAutoLook] = useState(false);
  const [today, setToday] = useState<TodayData | null>(null);
  const [skipped, setSkipped] = useState(false);
  const announced = useRef(new Set<string>());

  const api: Api = useCallback((path, init) => fetch(`/api/patient/${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-device-token': token, ...(init?.headers ?? {}) },
  }), [token]);

  const refresh = useCallback(async () => {
    try {
      const res = await api('today');
      if (res.ok) setToday(await res.json());
    } catch {
      // offline for a moment; the next poll retries
    }
  }, [api]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const markDone = useCallback(async (id: string) => {
    await api('reminder', { method: 'POST', body: JSON.stringify({ routineItemId: id }) });
    refresh();
  }, [api, refresh]);
  // until the server answers, guess day or night from the tablet's own clock (it sits in her home)
  const [guessNight] = useState(() => { const d = new Date(); return isNightTheme(d.getHours() * 60 + d.getMinutes()); });

  const go = useCallback((s: Screen, opts?: { autoLook?: boolean }) => {
    setAutoLook(Boolean(opts?.autoLook));
    setScreen(s);
  }, []);

  const remi = useRemi({ api, language, preferredName, people, markDone, go });

  const due = today?.items.find((i) => i.state === 'due');
  useEffect(() => {
    // While "Start Remi" is showing, wait: the browser would mute it, and Remi must hear the "done".
    if (!remi.active && !skipped) return;
    if (due && !announced.current.has(due.id)) {
      announced.current.add(due.id);
      const text = due.spokenMessage ?? due.label;
      if (remi.active) remi.announce({ id: due.id, text });
      else speak(text, language);
    }
  }, [due, language, remi, skipped]);

  const { hold } = remi;
  useEffect(() => { hold(screen === 'talk'); }, [screen, hold]);

  const say = remi.active ? remi.say : undefined;
  const night = theme ? theme === 'night' : today?.now.night ?? guessNight;
  // a long quiet spell at night makes Kodi drowsy; anything said wakes it
  const kodi = {
    emotion: night && remi.idleLong && remi.status === 'listening' ? 'sleepy' as const : remi.emotion,
    cue: remi.cue,
    night,
  };
  const tapDone = (id: string) => { remi.feel({ event: 'reminder-done' }); return markDone(id); };

  return (
    <div className="tablet flex h-dvh min-h-[34rem] flex-col overflow-hidden" data-theme={night ? 'night' : 'day'}>
      {remi.status === 'off' && !skipped && (
        <div className="tablet fixed inset-0 z-20 flex flex-col items-center justify-center gap-6 px-6 py-8 text-center" data-theme={night ? 'night' : 'day'}>
          <Kodi className="min-h-0 w-full max-w-lg flex-1" state="listening" emotion="happy" cue={null} night={night} label={t.startRemi} onPress={remi.start} />
          <div className="font-display">
            <p className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t.tapToBegin}</p>
            <p className="mt-3 max-w-xl text-2xl text-ink/75 sm:text-3xl">{t.startHint}</p>
          </div>
          <button onClick={() => setSkipped(true)} className="rounded-xl px-2 text-xl text-ink/70 underline underline-offset-4">{t.notNow}</button>
        </div>
      )}
      {due && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-4 bg-marigold px-6 py-5 text-2xl text-[#2b2340] sm:px-10 sm:text-3xl">
          <span className="max-w-3xl">{due.spokenMessage ?? due.label}</span>
          <button onClick={() => tapDone(due.id)} className="min-h-16 rounded-2xl bg-[#2b2340] px-8 font-display font-bold text-white">{t.done}</button>
        </div>
      )}
      {remi.active && screen !== 'home' && <RemiStatusLine status={remi.status} language={language} className="px-6 pt-5 sm:px-12" />}
      {screen === 'home' && <Home api={api} preferredName={preferredName} language={language} today={today} go={go} remi={remi} kodi={kodi} />}
      {screen === 'talk' && <Talk api={api} language={language} back={() => go('home')} />}
      {screen === 'face' && <Face api={api} language={language} back={() => go('home')} say={say} autoLook={autoLook} />}
      {screen === 'today' && <Today today={today} language={language} markDone={tapDone} back={() => go('home')} />}
    </div>
  );
}

