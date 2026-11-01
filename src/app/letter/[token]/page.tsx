import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import { hashDeviceToken } from '@/lib/device-token';
import { signedRecordingUrl } from '@/lib/clips';
import { letterLinkState } from '@/core/letters';
import { PRODUCT_NAME } from '@/core/brand';
import { NightStage } from '@/app/_site/night-stage';
import { BrandMark } from '@/app/_site/brand-mark';

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
      <main className="forest f-app">
        <NightStage />
        <section className="f-card-page f-glass">
          <Link href="/" className="f-brand"><BrandMark />{PRODUCT_NAME}</Link>
          <h1>This link has expired</h1>
          <p className="f-sub">A letter link opens once, and stays open for a day after that. Ask the family for a new one.</p>
        </section>
      </main>
    );
  }
  if (state === 'fresh') await db.from('letter_links').update({ used_at: new Date().toISOString() }).eq('id', link.id);
  const clip = memory.recording_id ? await signedRecordingUrl(memory.recording_id) : null;
  const name = memory.household?.preferred_name ?? '';

  return (
    <main className="forest f-app">
      <NightStage />
      <section className="f-card-page wide f-glass">
        <p className="f-eyebrow">A letter from {name}{memory.recipient_name ? ` for ${memory.recipient_name}` : ''}</p>
        <h1>{memory.title}</h1>
        <blockquote className="f-letter-quote">“{memory.quote}”</blockquote>
        {memory.translation && <p className="mt-4 text-dim"><span className="text-faint">translated:</span> {memory.translation}</p>}
        {clip && <audio controls src={clip} className="mt-7" />}
        <p className="mt-8 text-sm text-dim">Kept by {PRODUCT_NAME}, in {name}&apos;s own voice.</p>
      </section>
    </main>
  );
}
