'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { embedFrom } from '@/lib/face-client';
import { speak } from '@/lib/speech';
import { labelsFor, PHOTO_LABELS as P } from '../labels';
import type { Api } from '../patient-app';

export type PhotoInfo = { id: string; url: string; note: string | null; year: number | null };

/** An old photo from the family, and Remi asking about the day it was taken. English only for now. */
export function Photo({ api, language, back, say, onPhoto }: {
  api: Api; language: string; back: () => void;
  /** Remi's voice (pauses the listener); plain speech when hands-free is off. */
  say?: (text: string) => void;
  /** Which photo she is looking at (null when the screen closes), and who Remi recognised in it. */
  onPhoto: (photo: { id: string; note: string | null } | null, personName: string | null) => void;
}) {
  const t = labelsFor(language);
  const talk = say ?? ((text: string) => speak(text, language));
  const [photo, setPhoto] = useState<PhotoInfo | null | 'none'>(null);
  const img = useRef<HTMLImageElement>(null);
  const opened = useRef<string | null>(null);

  const load = useCallback(async (skip?: string) => {
    setPhoto(null);
    try {
      const res = await api(`photo${skip ? `?skip=${encodeURIComponent(skip)}` : ''}`);
      const data = (await res.json()) as { photo: PhotoInfo | null };
      setPhoto(data.photo ?? 'none');
    } catch {
      setPhoto('none');
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => onPhoto(null, null), [onPhoto]);

  // Once the photo is on screen: who is in it (the family's enrolled faces), then Remi asks about the day.
  async function shown() {
    if (!photo || photo === 'none' || opened.current === photo.id) return;
    opened.current = photo.id;
    let name: string | null = null;
    try {
      const embedding = img.current ? await embedFrom(img.current) : null;
      if (embedding) {
        const res = await api('identify', { method: 'POST', body: JSON.stringify({ embedding }) });
        const data = (await res.json().catch(() => null)) as { name?: string } | null;
        name = data?.name ?? null;
      }
    } catch { /* no face, or no model: the photo still works */ }
    onPhoto({ id: photo.id, note: photo.note }, name);
    talk(P.ask(photo.note, photo.year, name));
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-6 py-8 sm:px-12">
      <button onClick={back} className="self-start rounded-xl px-2 text-2xl underline underline-offset-4"><span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.back}</button>
      {photo === 'none' && <p className="text-3xl leading-snug text-ink/70">{P.none}</p>}
      {photo && photo !== 'none' && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a signed, short-lived URL; not an optimisable asset */}
          <img ref={img} src={photo.url} alt={photo.note ?? 'An old photo'} crossOrigin="anonymous" onLoad={shown}
            className="max-h-[60dvh] w-full rounded-[2rem] bg-ink object-contain" />
          {(photo.note || photo.year) && (
            <p className="font-display text-3xl font-semibold leading-snug sm:text-4xl">{photo.note}{photo.year ? ` · ${photo.year}` : ''}</p>
          )}
          <button onClick={() => load(photo.id)} className="min-h-20 rounded-3xl border-4 border-garden px-6 text-2xl font-semibold text-garden-deep">{P.another}</button>
        </>
      )}
      {photo === null && <p className="text-2xl text-ink/50">{t.looking}</p>}
    </main>
  );
}
