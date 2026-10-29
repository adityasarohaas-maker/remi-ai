'use client';
import { useEffect, useRef, useState } from 'react';

type Turn = { role: 'user' | 'assistant'; content: string };
const OFF_KEY = 'remi-persona-off';

function mp3(b64: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'audio/mpeg' });
}

export function PersonaChat({ name }: { name: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState<boolean | null>(null);
  const [intro, setIntro] = useState(true);
  const [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // whether this viewer switched it off, remembered on this device only
    let saved = false;
    try { saved = localStorage.getItem(OFF_KEY) === '1'; } catch { /* private mode */ }
    setOff(saved); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns]);

  function toggle(next: boolean) {
    setOff(next);
    try { localStorage.setItem(OFF_KEY, next ? '1' : '0'); } catch { /* fine */ }
  }

  function play(clip: Blob) {
    queue.current = queue.current.then(() => new Promise<void>((resolve) => {
      audio.current ??= new Audio();
      audio.current.src = URL.createObjectURL(clip);
      audio.current.onended = audio.current.onerror = () => resolve();
      audio.current.play().catch(() => resolve());
    }));
  }

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    setText('');
    setError('');
    setBusy(true);
    const history = turns.slice(-10);
    setTurns((t) => [...t, { role: 'user', content }, { role: 'assistant', content: '' }]);
    try {
      const res = await fetch('/api/family/persona', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: content, history }) });
      if (!res.ok || !res.body) throw new Error(res.status === 403 ? 'This was not allowed for the family.' : 'Something went wrong.');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let spoken = '';
      const append = (s: string) => { spoken = spoken ? `${spoken} ${s}` : s; setTurns((t) => [...t.slice(0, -1), { role: 'assistant', content: spoken }]); };
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const msg = JSON.parse(line) as { say?: string; audio?: string; delta?: string; done?: boolean; reply?: string | null; error?: string };
          if (msg.say) { append(msg.say); if (msg.audio) play(mp3(msg.audio)); }
          else if (msg.delta) { spoken += msg.delta; setTurns((t) => [...t.slice(0, -1), { role: 'assistant', content: spoken }]); }
          if (msg.done && msg.error) throw new Error('Something went wrong.');
        }
      }
    } catch (e) {
      setError((e as Error).message);
      setTurns((t) => t.slice(0, -2));
    } finally {
      setBusy(false);
    }
  }

  if (off === null) return null;
  if (off) {
    return (
      <div className="rounded-xl border bg-white p-5">
        <p>You turned this off for yourself.</p>
        <button onClick={() => toggle(false)} className="mt-3 text-garden underline">Turn it back on</button>
      </div>
    );
  }
  return (
    <div>
      {intro && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p><b>What this is.</b> An AI that speaks the way {name} did, built from the stories she told Remi. It is not her, and it will say so if you ask. Her real voice and her real words are under Story and Letters. The family chose to allow this; you can switch it off for yourself any time.</p>
          <div className="mt-3 flex gap-4">
            <button onClick={() => setIntro(false)} className="rounded-lg bg-garden px-4 py-2 text-white">I understand</button>
            <button onClick={() => toggle(true)} className="underline">Turn off for me</button>
          </div>
        </div>
      )}
      {!intro && (
        <>
          <div className="mt-2 flex items-center gap-2 text-sm text-stone-500">
            <span className="font-medium text-stone-700">{name}</span>
            <span className="rounded-full border border-stone-400 px-2 py-0.5 text-xs uppercase tracking-wide" title="This is an AI made from her stories, not her">AI</span>
            <button onClick={() => toggle(true)} className="ml-auto text-xs underline">Turn off for me</button>
          </div>
          <div className="mt-3 max-h-[60dvh] space-y-3 overflow-y-auto rounded-xl border bg-white p-4">
            {turns.length === 0 && <p className="text-stone-500">Say hello.</p>}
            {turns.map((t, i) => (
              <p key={i} className={t.role === 'user' ? 'text-right' : ''}>
                <span className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 ${t.role === 'user' ? 'bg-leaf' : 'bg-stone-100'}`}>
                  {t.role === 'assistant' && <span className="mr-2 rounded-full border border-stone-400 px-1.5 text-[10px] uppercase text-stone-500">AI</span>}
                  {t.content || '…'}
                </span>
              </p>
            ))}
            <div ref={bottom} />
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={`Say something to ${name}`} className="flex-1 rounded-lg border px-4 py-3" />
            <button disabled={busy} className="rounded-lg bg-garden px-5 py-3 text-white disabled:opacity-60">{busy ? '…' : 'Send'}</button>
          </form>
        </>
      )}
    </div>
  );
}
