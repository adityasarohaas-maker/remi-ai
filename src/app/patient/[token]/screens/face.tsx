'use client';
import { useEffect, useRef, useState } from 'react';
import { embedFrom, fileToImage } from '@/lib/face-client';
import { noFaceMessage } from '@/core/messages';
import { speak } from '@/lib/speech';
import { labelsFor } from '../labels';
import type { Api } from '../patient-app';

type Result = { name?: string; relation?: string; reply: string };

export function Face({ api, language, back, say, autoLook = false }: {
  api: Api; language: string; back: () => void;
  /** Remi's voice (pauses the listener); plain speech when hands-free is off. */
  say?: (text: string) => void;
  /** Opened by "Remi, who is this?": look as soon as the camera is on. */
  autoLook?: boolean;
}) {
  const talk = say ?? ((text: string) => speak(text, language));
  const t = labelsFor(language);
  const video = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<'starting' | 'on' | 'off'>('starting');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera('off');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((tr) => tr.stop()); return; }
        stream = s;
        if (video.current) video.current.srcObject = s;
        setCamera('on');
      })
      .catch(() => setCamera('off'));
    return () => { cancelled = true; stream?.getTracks().forEach((tr) => tr.stop()); };
  }, []);

  const looked = useRef(false);
  useEffect(() => {
    if (!autoLook || camera !== 'on' || looked.current) return;
    const id = setTimeout(() => { // let the camera settle first
      if (!video.current || looked.current) return;
      looked.current = true;
      identify(video.current);
    }, 1200);
    return () => clearTimeout(id);
  }, [autoLook, camera]); // eslint-disable-line react-hooks/exhaustive-deps

  async function identify(source: HTMLVideoElement | HTMLImageElement) {
    setBusy(true);
    setResult(null);
    try {
      const embedding = await embedFrom(source);
      if (!embedding) {
        const reply = noFaceMessage(language);
        setResult({ reply });
        talk(reply);
        return;
      }
      const res = await api('identify', { method: 'POST', body: JSON.stringify({ embedding }) });
      const data = await res.json().catch(() => null);
      const r: Result = res.ok && data ? data : { reply: t.retry };
      setResult(r);
      talk(r.reply);
    } catch {
      setResult({ reply: t.retry });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8 sm:px-12">
      <button onClick={back} className="self-start rounded-xl px-2 text-2xl underline underline-offset-4">← {t.back}</button>
      {camera !== 'off' && (
        <video ref={video} autoPlay playsInline muted className="aspect-video w-full rounded-[2rem] bg-ink object-cover" />
      )}
      {camera === 'on' && (
        <button
          disabled={busy}
          onClick={() => video.current && identify(video.current)}
          className="min-h-32 rounded-[2.5rem] bg-garden text-4xl font-semibold text-paper disabled:bg-garden-deep sm:text-5xl"
        >
          {busy ? t.looking : t.who}
        </button>
      )}
      <label className="flex min-h-20 cursor-pointer items-center justify-center rounded-3xl border-4 border-garden px-6 text-2xl font-semibold text-garden-deep focus-within:outline focus-within:outline-4 focus-within:outline-marigold">
        {busy && camera !== 'on' ? t.looking : t.choosePhoto}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const input = e.currentTarget;
            const f = input.files?.[0];
            input.value = '';
            if (f) identify(await fileToImage(f));
          }}
        />
      </label>
      {result?.name && (
        <p className="settle text-6xl font-bold text-garden-deep">
          {result.name}
          <span className="ml-3 text-3xl font-normal text-ink/70">{result.relation}</span>
        </p>
      )}
      {result && <p className="settle text-3xl leading-snug sm:text-4xl" aria-live="polite">{result.reply}</p>}
    </main>
  );
}
