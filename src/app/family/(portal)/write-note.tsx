'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function WriteNoteButton({ hasNote }: { hasNote: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function write() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/family/digest', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'The note could not be written right now. Please try again.');
        return;
      }
      router.refresh();
    } catch {
      setError('No connection. Check the internet and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button onClick={write} disabled={busy} className="rounded-lg bg-garden px-4 py-2 text-white disabled:opacity-60">
        {busy ? 'Writing… (about 20 seconds)' : hasNote ? "Rewrite today's note" : "Write today's note"}
      </button>
      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
    </div>
  );
}
