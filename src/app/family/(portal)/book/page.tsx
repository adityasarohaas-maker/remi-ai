import QRCode from 'qrcode';
import { requireFamily } from '@/lib/household';
import { memoryFromRow, MEMORY_COLUMNS, type MemoryDbRow } from '@/core/memory-row';
import { bookMemories } from '@/core/book';
import { PrintButton } from './print-button';
import './print.css';

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
}

/** Her story as a book: cover, a chapter a page, her words in large type, a code beside each to hear her say it. */
export default async function BookPage() {
  const { sb, householdId } = await requireFamily();
  const [{ data: h }, { data: rows }, { data: photos }] = await Promise.all([
    sb.from('households').select('preferred_name, patient_name, passed_on, status').eq('id', householdId).single(),
    sb.from('memories').select(MEMORY_COLUMNS).eq('household_id', householdId),
    sb.from('photos').select('storage_path, note, year').eq('household_id', householdId).order('year', { ascending: true, nullsFirst: false }).limit(1),
  ]);
  const name = h?.preferred_name ?? '';
  const chapters = bookMemories(((rows ?? []) as MemoryDbRow[]).map(memoryFromRow));
  const years = chapters.flatMap((c) => c.memories.map((m) => m.yearFrom)).filter((y): y is number => !!y);
  const span = years.length ? `${Math.min(...years)} – ${h?.passed_on ? h.passed_on.slice(0, 4) : 'today'}` : '';
  const cover = photos?.[0] ? (await sb.storage.from('family-media').createSignedUrl(photos[0].storage_path as string, 600)).data?.signedUrl ?? null : null;
  const qr = new Map<string, string>();
  for (const c of chapters) for (const m of c.memories) {
    if (m.recordingId) qr.set(m.id, await QRCode.toDataURL(`${baseUrl()}/family/story#m-${m.id}`, { margin: 0, width: 96 }));
  }

  return (
    <div className="book">
      <div className="no-print mb-6 flex flex-wrap items-center gap-4 rounded-xl border bg-surface p-4 text-sm">
        <span>Only what the whole family may read goes in: {chapters.reduce((n, c) => n + c.memories.length, 0)} memories. Each code opens the recording.</span>
        <PrintButton />
      </div>
      <section className="book-cover">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
          <img src={cover} alt="" className="mx-auto mb-6 max-h-64 rounded-xl object-cover" />
        )}
        <p className="text-sm uppercase tracking-widest text-dim">In her own words</p>
        <h1 className="mt-2 text-4xl font-semibold">{h?.patient_name ?? name}</h1>
        {span && <p className="mt-2 text-dim">{span}</p>}
        <p className="mt-10 text-sm text-dim">Kept by Remi, from what {name} told it.</p>
      </section>
      {chapters.map((c) => (
        <section key={c.stage} className="book-chapter mt-10">
          <h2 className="f-h1">{c.title}</h2>
          {c.stage === 'wishes' && <p className="mt-1 text-sm text-dim">{name}&apos;s wishes, in her own words. Not a legal will.</p>}
          <div className="mt-6">
            {c.memories.map((m) => (
              <article key={m.id} className="book-memory">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="f-h3">{m.title}{m.yearFrom ? <span className="ml-2 text-sm font-normal text-dim">{m.yearFrom}</span> : null}</h3>
                  {qr.get(m.id) && (
                    // eslint-disable-next-line @next/next/no-img-element -- a generated data URL
                    <img src={qr.get(m.id)} alt="Scan to hear her tell it" width={64} height={64} className="shrink-0" />
                  )}
                </div>
                <blockquote className="book-quote mt-2 border-l-2 border-line pl-4">“{m.quote}”</blockquote>
                {m.translation && <p className="mt-1 text-sm text-dim">{m.translation}</p>}
              </article>
            ))}
          </div>
        </section>
      ))}
      {!chapters.length && <p className="text-dim">Nothing to print yet.</p>}
    </div>
  );
}
