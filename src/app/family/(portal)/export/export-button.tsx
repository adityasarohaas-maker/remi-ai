'use client';
import { useState } from 'react';
import { zipSync, strToU8 } from 'fflate';
import { exportFileName } from '@/core/book';

type Manifest = {
  exportedAt: string; household: { preferred_name: string } | null; consent: unknown;
  memories: unknown[];
  audio: { id: string; file: string; url: string | null; transcript: string | null; language: string | null; createdAt: string }[];
  photos: { id: string; file: string; url: string | null; note: string | null; year: number | null }[];
};

/** Builds the zip in the browser: nothing of hers passes through a third server. */
export function ExportButton({ name }: { name: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState('');

  async function run() {
    setState('working');
    try {
      setProgress('Listing everything…');
      const res = await fetch('/api/family/export-manifest');
      if (!res.ok) throw new Error('manifest');
      const m = (await res.json()) as Manifest;
      const files: Record<string, Uint8Array> = {};
      files['memories.json'] = strToU8(JSON.stringify({ exportedAt: m.exportedAt, household: m.household, consent: m.consent, memories: m.memories }, null, 2));
      files['README.txt'] = strToU8(`Remi archive for ${name}\n\nmemories.json — every memory you may see, with the id of its recording\naudio/ — her voice, one clip per turn\ntranscripts/ — what the tablet heard, one text file per clip\nphotos/ — the photos the family added\nbook.html — her story as a page you can print\n\nExported ${m.exportedAt}. Everything here is yours to keep.\n`);
      let n = 0;
      const total = m.audio.length + m.photos.length + 1;
      for (const a of m.audio) {
        setProgress(`Fetching clips… ${++n}/${total}`);
        if (a.transcript) files[`transcripts/${a.id}.txt`] = strToU8(`${a.createdAt}\n${a.language ?? ''}\n\n${a.transcript}\n`);
        if (!a.url) continue;
        try { files[a.file] = new Uint8Array(await (await fetch(a.url)).arrayBuffer()); } catch { /* one lost clip never stops the archive */ }
      }
      for (const p of m.photos) {
        setProgress(`Fetching photos… ${++n}/${total}`);
        if (!p.url) continue;
        try { files[p.file] = new Uint8Array(await (await fetch(p.url)).arrayBuffer()); } catch { /* same */ }
      }
      setProgress('Adding the book…');
      try { files['book.html'] = strToU8(await (await fetch('/family/book')).text()); } catch { /* same */ }
      setProgress('Zipping…');
      const zip = zipSync(files, { level: 0 }); // audio and photos are already compressed
      const blob = new Blob([zip.buffer as ArrayBuffer], { type: 'application/zip' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = exportFileName(name, new Date());
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <div>
      <button onClick={run} disabled={state === 'working'} className="rounded-lg bg-garden px-5 py-3 text-white disabled:opacity-60">
        {state === 'working' ? 'Preparing…' : 'Download everything'}
      </button>
      {state === 'working' && <p className="mt-2 text-sm text-stone-600">{progress} This can take a few minutes for a big archive.</p>}
      {state === 'done' && <p className="mt-2 text-sm text-stone-600">Saved. Keep it somewhere safe.</p>}
      {state === 'error' && <p role="alert" className="mt-2 text-sm text-red-700">Something went wrong. Try again in a moment.</p>}
    </div>
  );
}
