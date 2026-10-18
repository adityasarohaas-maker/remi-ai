'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { speak } from '@/lib/speech';
import { labelsFor } from './labels';
import { useRemi, type RemiPerson, type RemiStatus } from './use-remi';
import { Home } from './screens/home';
import { Talk } from './screens/talk';
import { Face } from './screens/face';
import { Today, type TodayData } from './screens/today';

export type Api = (path: string, init?: RequestInit) => Promise<Response>;
type Screen = 'home' | 'talk' | 'face' | 'today';

export function PatientApp({ token, preferredName, language, people }: { token: string; preferredName: string; language: string; people: RemiPerson[] }) {
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

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      {remi.status === 'off' && !skipped && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-8 bg-paper px-6 text-center">
          <button onClick={remi.start} className="min-h-40 w-full max-w-xl rounded-[2.5rem] bg-garden text-5xl font-semibold text-paper hover:bg-garden-deep sm:text-6xl">
            {t.startRemi}
          </button>
          <p className="max-w-xl text-2xl sm:text-3xl">{t.startHint}</p>
          <button onClick={() => setSkipped(true)} className="rounded-xl px-2 text-xl text-ink/70 underline underline-offset-4">{t.notNow}</button>
        </div>
      )}
      {due && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-4 bg-marigold px-6 py-5 text-2xl text-ink sm:px-10 sm:text-3xl">
          <span className="max-w-3xl">{due.spokenMessage ?? due.label}</span>
          <button onClick={() => markDone(due.id)} className="min-h-16 rounded-2xl bg-ink px-8 text-paper">{t.done}</button>
        </div>
      )}
      {remi.active && <RemiBar status={remi.status} language={language} />}
      {screen === 'home' && <Home api={api} preferredName={preferredName} language={language} today={today} go={go} say={say} heard={remi.heard} reply={remi.reply} />}
      {screen === 'talk' && <Talk api={api} language={language} back={() => go('home')} />}
      {screen === 'face' && <Face api={api} language={language} back={() => go('home')} say={say} autoLook={autoLook} />}
      {screen === 'today' && <Today today={today} language={language} markDone={markDone} back={() => go('home')} />}
    </div>
  );
}

function RemiBar({ status, language }: { status: RemiStatus; language: string }) {
  const t = labelsFor(language);
  const text = {
    off: '', listening: t.remiListening, thinking: t.remiThinking, speaking: t.remiSpeaking,
    blocked: t.remiBlocked, unsupported: t.remiUnsupported,
  }[status];
  const live = status === 'listening' || status === 'thinking' || status === 'speaking';
  return (
    <div className="flex items-center gap-3 px-6 pt-5 text-xl text-ink/80 sm:px-12 sm:text-2xl" role="status">
      <span aria-hidden className={`size-4 shrink-0 rounded-full ${status === 'speaking' ? 'remi-dot bg-marigold' : live ? 'remi-dot bg-garden' : 'bg-stone-400'}`} />
      {text}
    </div>
  );
}
