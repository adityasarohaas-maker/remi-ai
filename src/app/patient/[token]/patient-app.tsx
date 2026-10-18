'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { speak } from '@/lib/speech';
import { labelsFor } from './labels';
import { Home } from './screens/home';
import { Talk } from './screens/talk';
import { Face } from './screens/face';
import { Today, type TodayData } from './screens/today';

export type Api = (path: string, init?: RequestInit) => Promise<Response>;
type Screen = 'home' | 'talk' | 'face' | 'today';

export function PatientApp({ token, preferredName, language }: { token: string; preferredName: string; language: string }) {
  const t = labelsFor(language);
  const [screen, setScreen] = useState<Screen>('home');
  const [today, setToday] = useState<TodayData | null>(null);
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

  const due = today?.items.find((i) => i.state === 'due');
  useEffect(() => {
    if (due && !announced.current.has(due.id)) {
      announced.current.add(due.id);
      speak(due.spokenMessage ?? due.label, language);
    }
  }, [due, language]);

  async function markDone(id: string) {
    await api('reminder', { method: 'POST', body: JSON.stringify({ routineItemId: id }) });
    refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      {due && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-4 bg-marigold px-6 py-5 text-2xl text-ink sm:px-10 sm:text-3xl">
          <span className="max-w-3xl">{due.spokenMessage ?? due.label}</span>
          <button onClick={() => markDone(due.id)} className="min-h-16 rounded-2xl bg-ink px-8 text-paper">{t.done}</button>
        </div>
      )}
      {screen === 'home' && <Home api={api} preferredName={preferredName} language={language} today={today} go={setScreen} />}
      {screen === 'talk' && <Talk api={api} language={language} back={() => setScreen('home')} />}
      {screen === 'face' && <Face api={api} language={language} back={() => setScreen('home')} />}
      {screen === 'today' && <Today today={today} language={language} markDone={markDone} back={() => setScreen('home')} />}
    </div>
  );
}
