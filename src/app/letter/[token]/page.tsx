import { supabaseAdmin } from '@/lib/supabase/server';
import { hashDeviceToken } from '@/lib/device-token';
import { signedRecordingUrl } from '@/lib/clips';
import { letterLinkState } from '@/core/letters';

/** A letter she left for someone who may have no account: reached by a private link that was emailed to them. */
export default async function LetterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = supabaseAdmin();
  const { data: link } = token && token.length <= 200
    ? await db.from('letter_links').select('id, expires_at, used_at, memory:memories(id, title, quote, translation, summary, recording_id, recipient_name, opened_at, household:households(preferred_name))')
      .eq('token_hash', hashDeviceToken(token)).maybeSingle()
    : { data: null };
  const memory = link?.memory as unknown as { id: string; title: string; quote: string; translation: string | null; summary: string; recording_id: string | null; recipient_name: string | null; opened_at: string | null; household: { preferred_name: string } | null } | null;
  const state = link ? letterLinkState({ expiresAt: link.expires_at as string, usedAt: link.used_at as string | null }, new Date()) : 'expired';
  if (!link || !memory || !memory.opened_at || state === 'expired') {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold">This link has expired</h1>
        <p className="mt-3 text-stone-600">A letter link opens once, and stays open for a day after that. Ask the family for a new one.</p>
      </main>
    );
  }
  if (state === 'fresh') await db.from('letter_links').update({ used_at: new Date().toISOString() }).eq('id', link.id);
  const clip = memory.recording_id ? await signedRecordingUrl(memory.recording_id) : null;
  const name = memory.household?.preferred_name ?? '';

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <p className="text-sm uppercase tracking-wide text-stone-500">A letter from {name}{memory.recipient_name ? ` for ${memory.recipient_name}` : ''}</p>
      <h1 className="mt-2 text-3xl font-semibold">{memory.title}</h1>
      <blockquote className="mt-6 border-l-4 border-leaf pl-4 text-xl leading-relaxed">“{memory.quote}”</blockquote>
      {memory.translation && <p className="mt-3 text-stone-600"><span className="text-stone-400">translated:</span> {memory.translation}</p>}
      {clip && <audio controls src={clip} className="mt-6 w-full" />}
      <p className="mt-8 text-sm text-stone-500">Kept by Remi, in {name}&apos;s own voice.</p>
    </main>
  );
}
