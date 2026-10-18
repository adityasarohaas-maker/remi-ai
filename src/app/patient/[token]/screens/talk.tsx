'use client';
import { useEffect, useState } from 'react';
import { listenOnce, speak, speechRecognitionCtor } from '@/lib/speech';
import { labelsFor } from '../labels';
import type { Api } from '../patient-app';

export function Talk({ api, language, back }: { api: Api; language: string; back: () => void }) {
  const t = labelsFor(language);
  const [canListen, setCanListen] = useState<boolean | null>(null);
  const [state, setState] = useState<'idle' | 'listening' | 'thinking'>('idle');
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [typed, setTyped] = useState('');

  // Decided after mount so server and client render the same first frame.
  useEffect(() => { setCanListen(speechRecognitionCtor(window) !== null); }, []);

  async function send(text: string) {
    if (!text.trim()) { setState('idle'); return; }
    setHeard(text);
    setReply('');
    setState('thinking');
    try {
      const res = await api('talk', { method: 'POST', body: JSON.stringify({ text }) });
      const data = await res.json().catch(() => ({}));
      const answer = res.ok ? data.reply : t.retry;
      setReply(answer);
      speak(answer, language);
    } catch {
      setReply(t.retry);
    } finally {
      setState('idle');
    }
  }

  async function listen() {
    setState('listening');
    setReply('');
    try {
      await send(await listenOnce(language));
    } catch {
      setState('idle');
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-8 sm:px-12">
      <button onClick={back} className="self-start rounded-xl px-2 text-2xl underline underline-offset-4">← {t.back}</button>
      {canListen && (
        <button
          onClick={listen}
          disabled={state !== 'idle'}
          className="min-h-44 rounded-[2.5rem] bg-garden text-4xl font-semibold text-paper disabled:bg-garden-deep sm:text-5xl"
        >
          {state === 'listening' ? t.listening : state === 'thinking' ? t.thinking : t.tapSpeak}
        </button>
      )}
      {canListen === false && (
        <form onSubmit={(e) => { e.preventDefault(); send(typed); setTyped(''); }} className="flex flex-col gap-4">
          <label htmlFor="say" className="text-3xl">{t.typeHere}</label>
          <input id="say" value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={500} autoComplete="off" className="rounded-2xl border-4 border-leaf bg-white px-5 py-4 text-3xl" />
          <button disabled={state !== 'idle'} className="min-h-24 rounded-3xl bg-garden text-3xl font-semibold text-paper disabled:opacity-70">
            {state === 'thinking' ? t.thinking : t.send}
          </button>
        </form>
      )}
      {heard && <p className="text-2xl text-ink/70">{t.youSaid}: “{heard}”</p>}
      {reply && <p className="settle text-4xl leading-snug sm:text-5xl" aria-live="polite">{reply}</p>}
    </main>
  );
}
