'use client';
import { useRef, useState } from 'react';
import type { Memory } from '@/core/types';
import { playClip, markMemory } from './actions';

export function MemoryCard({ m, name }: { m: Memory; name: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'none'>('idle');
  const audio = useRef<HTMLAudioElement | null>(null);

  async function play() {
    if (state === 'playing') { audio.current?.pause(); setState('idle'); return; }
    setState('loading');
    const url = await playClip(m.id);
    if (!url) { setState('none'); return; }
    audio.current ??= new Audio();
    audio.current.src = url;
    audio.current.onended = () => setState('idle');
    audio.current.onerror = () => setState('none');
    try { await audio.current.play(); setState('playing'); } catch { setState('none'); }
  }

  const year = m.yearFrom ? (m.yearTo && m.yearTo !== m.yearFrom ? `${m.yearFrom}–${m.yearTo}` : String(m.yearFrom)) : null;
  return (
    <article id={`m-${m.id}`} className="rounded-xl border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="f-h3">{m.title}</h3>
        <div className="flex items-center gap-2 text-xs text-dim">
          {year && <span>{year}</span>}
          {m.kind !== 'story' && <span className="rounded-full bg-panel px-2 py-0.5">{m.kind}</span>}
          {m.confidence === 'unsure' && <span className="rounded-full bg-garden/25 px-2 py-0.5 text-ink">Not sure this is accurate</span>}
        </div>
      </div>
      <blockquote className="mt-3 border-l-2 border-garden pl-4 text-[1.05rem] leading-relaxed">“{m.quote}”</blockquote>
      {m.translation && <p className="mt-2 text-sm text-dim"><span className="text-faint">translated:</span> {m.translation}</p>}
      <p className="mt-3 text-sm text-dim">{m.summary}</p>
      {(m.people.length > 0 || m.places.length > 0) && (
        <p className="mt-2 text-xs text-dim">{[...m.people, ...m.places].join(' · ')}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {m.recordingId ? (
          <button onClick={play} disabled={state === 'loading'} className="rounded-full bg-garden px-4 py-1.5 text-sm text-night disabled:opacity-60">
            {state === 'playing' ? '■ Stop' : state === 'loading' ? '…' : `▶ Hear ${name} tell it`}
          </button>
        ) : <span className="text-xs text-faint">No recording for this one</span>}
        {state === 'none' && <span className="text-xs text-dim">Couldn&apos;t play the clip.</span>}
        <span className="ml-auto flex items-center gap-1 text-xs text-dim">
          <button onClick={() => markMemory(m.id, 'sure')} className={`rounded-full px-2 py-0.5 ${m.confidence === 'sure' ? 'bg-leaf text-garden' : 'hover:bg-leaf'}`}>True</button>
          <button onClick={() => markMemory(m.id, 'unsure')} className={`rounded-full px-2 py-0.5 ${m.confidence === 'unsure' ? 'bg-garden/25' : 'hover:bg-leaf'}`}>Unsure</button>
        </span>
      </div>
    </article>
  );
}
