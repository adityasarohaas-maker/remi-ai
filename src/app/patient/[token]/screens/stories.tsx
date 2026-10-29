'use client';
import { useEffect, useRef, useState } from 'react';
import { labelsFor, STORIES_LABELS as S } from '../labels';
import type { Api } from '../patient-app';

type Story = { id: string; title: string; chapter: string; year: number | null; quote: string; url: string | null };

/** Her own stories, in her own voice. For her while she is here; for the family, on the same tablet, after. */
export function Stories({ api, language, back, preferredName, passed = false }: {
  api: Api; language: string; back?: () => void; preferredName: string; passed?: boolean;
}) {
  const t = labelsFor(language);
  const [stories, setStories] = useState<Story[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    api('stories').then((r) => r.json()).then((d: { stories?: Story[] }) => { if (!cancelled) setStories(d.stories ?? []); }).catch(() => { if (!cancelled) setStories([]); });
    return () => { cancelled = true; };
  }, [api]);

  function play(s: Story) {
    if (!s.url) return;
    audio.current ??= new Audio();
    if (playing === s.id) { audio.current.pause(); setPlaying(null); return; }
    audio.current.src = s.url;
    audio.current.onended = () => setPlaying(null);
    audio.current.play().then(() => setPlaying(s.id)).catch(() => setPlaying(null));
  }

  // a chapter heading above the first story of each chapter
  const headings = (stories ?? []).map((s, i, all) => (i === 0 || all[i - 1].chapter !== s.chapter ? s.chapter : null));
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-6 py-8 sm:px-12">
      {back && <button onClick={back} className="self-start rounded-xl px-2 text-2xl underline underline-offset-4"><span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.back}</button>}
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{passed ? S.inMemory(preferredName) : S.title}</h1>
      {passed && <p className="text-2xl text-ink/70">{S.passedHint(preferredName)}</p>}
      {stories === null && <p className="text-2xl text-ink/50">{t.looking}</p>}
      {stories?.length === 0 && <p className="text-2xl text-ink/70">{S.none}</p>}
      <ul className="space-y-3">
        {(stories ?? []).map((s, i) => {
          const heading = headings[i];
          return (
            <li key={s.id}>
              {heading && <p className="mb-2 mt-4 text-xl font-semibold text-ink/60">{heading}</p>}
              <button onClick={() => play(s)}
                className={`flex w-full items-center gap-4 rounded-3xl p-4 text-left shadow-[0_0_0_1px_var(--ring)] ${playing === s.id ? 'bg-garden text-paper' : 'bg-surface/70'}`}>
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-leaf text-2xl text-garden-deep">{playing === s.id ? '■' : '▶'}</span>
                <span className="min-w-0">
                  <span className="block font-display text-2xl font-semibold leading-tight">{s.title}{s.year ? <span className="ml-2 text-lg font-normal opacity-70">{s.year}</span> : null}</span>
                  <span className="line-clamp-1 block text-lg opacity-75">“{s.quote}”</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
