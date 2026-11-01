'use client';
import { useRef, useState } from 'react';
import { ask, type AskResult } from './actions';
import { speechRecognitionCtor, listenOnce } from '@/lib/speech';

export function AskForm({ name, suggestions }: { name: string; suggestions: string[] }) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [listening, setListening] = useState(false);
  const canListen = typeof window !== 'undefined' && !!speechRecognitionCtor(window);
  const audio = useRef<HTMLAudioElement | null>(null);

  async function submit(q: string) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setResult(null);
    setResult(await ask(q));
    setBusy(false);
  }

  async function hear() {
    setListening(true);
    try { const heard = await listenOnce('en-US'); if (heard) { setQuestion(heard); await submit(heard); } }
    catch { /* no mic */ }
    finally { setListening(false); }
  }

  function play(url: string) {
    audio.current ??= new Audio();
    audio.current.src = url;
    audio.current.play().catch(() => {});
  }

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); submit(question); }} className="flex gap-2">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} placeholder={`What did ${name} say about…`} className="flex-1 rounded-lg border px-4 py-3" />
        {canListen && <button type="button" onClick={hear} disabled={busy || listening} className="rounded-lg border px-4 py-3" aria-label="Ask by voice">{listening ? '…' : '🎙'}</button>}
        <button disabled={busy} className="rounded-lg bg-garden px-5 py-3 text-night disabled:opacity-60">{busy ? 'Remembering…' : 'Ask'}</button>
      </form>
      {!result && !busy && (
        <p className="mt-3 text-sm text-dim">Try: {suggestions.map((s, i) => <button key={i} onClick={() => { setQuestion(s); submit(s); }} className="ml-2 underline">{s}</button>)}</p>
      )}
      {result && 'error' in result && <p role="alert" className="mt-4 text-alarm">{result.error}</p>}
      {result && !('error' in result) && (
        <article className="mt-6 rounded-xl border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-dim">Remi remembers</p>
          <p className="mt-2 text-lg leading-relaxed">{result.answer}</p>
          {result.clips.length > 0 && (
            <ul className="mt-4 space-y-2">
              {result.clips.map((c) => (
                <li key={c.memoryId} className="flex items-center justify-between gap-3 rounded-lg bg-panel px-3 py-2 text-sm">
                  <a href={`/family/story#m-${c.memoryId}`} className="underline">{c.title}</a>
                  {c.url ? <button onClick={() => play(c.url!)} className="rounded-full bg-garden px-3 py-1 text-night">▶ Hear {name}</button> : <span className="text-faint">no clip</span>}
                </li>
              ))}
            </ul>
          )}
          {result.nothingFound && <p className="mt-3 text-sm text-dim">Remi only tells you what {name} really said. Ask her about it on the tablet, or add it under Questions.</p>}
        </article>
      )}
    </div>
  );
}
