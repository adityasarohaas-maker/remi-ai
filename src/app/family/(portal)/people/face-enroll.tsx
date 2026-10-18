'use client';
import { useState } from 'react';
import { embedFrom, fileToImage } from '@/lib/face-client';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { saveFaceEmbedding } from './actions';

export function FaceEnroll({ personId, householdId }: { personId: string; householdId: string }) {
  const [status, setStatus] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      setStatus('Reading the face… (the first time takes a few seconds)');
      const embedding = await embedFrom(await fileToImage(file));
      if (!embedding) {
        setStatus('No clear face found. Use a photo where the face is large and well lit.');
        return;
      }
      const path = `${householdId}/people/${personId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabaseBrowser().storage.from('family-media').upload(path, file, { contentType: file.type || 'image/jpeg' });
      if (error) {
        setStatus(`Upload failed: ${error.message}`);
        return;
      }
      await saveFaceEmbedding(personId, embedding, path);
      setStatus('Saved. 2–3 different photos work best.');
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      input.value = '';
    }
  }

  return (
    <div className="mt-2">
      <label className="inline-block cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-stone-100">
        Add a face photo
        <input type="file" accept="image/*" onChange={onFile} className="sr-only" />
      </label>
      {status && <p className="mt-1 text-sm text-stone-600" aria-live="polite">{status}</p>}
    </div>
  );
}
