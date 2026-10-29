import { requireFamily } from '@/lib/household';
import { localParts, safeTimeZone } from '@/core/time';
import { noteBlocks } from '@/core/note-blocks';
import Link from 'next/link';
import { WriteNoteButton } from './write-note';
import { memoryFromRow, MEMORY_COLUMNS, type MemoryDbRow } from '@/core/memory-row';
import { MemoryCard } from './story/memory-card';

const REASON: Record<string, string> = {
  safety: 'Safety words heard',
  call_request: 'Asked for a call',
  help_button: 'Pressed “I need help”',
  message: 'A message from Remi',
};

const MOOD_STYLE: Record<string, string> = {
  calm: 'bg-leaf', happy: 'bg-leaf', confused: 'bg-marigold/50', anxious: 'bg-marigold/70', sad: 'bg-stone-200', agitated: 'bg-red-100',
};

type Convo = { text: string; reply: string; mood?: string; sensitiveTopic?: string | null };

export default async function FamilyHome() {
  const { sb, householdId } = await requireFamily();
  const { data: h } = await sb.from('households').select('preferred_name, timezone').eq('id', householdId).single();
  const tz = safeTimeZone(h?.timezone);
  const today = localParts(new Date(), tz).day;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: alerts }, { data: digest }, { data: talk }, { data: fresh }] = await Promise.all([
    sb.from('events').select('payload, created_at').eq('household_id', householdId).eq('type', 'alert').order('created_at', { ascending: false }).limit(10),
    sb.from('digests').select('summary, created_at').eq('household_id', householdId).eq('day', today).maybeSingle(),
    sb.from('events').select('payload, created_at').eq('household_id', householdId).eq('type', 'conversation').order('created_at', { ascending: false }).limit(10),
    sb.from('memories').select(MEMORY_COLUMNS).eq('household_id', householdId).gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(3),
  ]);
  const newStories = ((fresh ?? []) as MemoryDbRow[]).map(memoryFromRow);
  const when = (iso: string) => {
    const p = localParts(new Date(iso), tz);
    return p.day === today ? p.prettyTime : `${p.prettyTime}, ${p.prettyDate}`;
  };
  const name = h?.preferred_name ?? '';

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="order-2 lg:order-1">
        <h1 className="text-2xl font-semibold">Evening note</h1>
        {digest ? (
          <article className="mt-3 max-w-prose rounded-xl border bg-white p-5 leading-relaxed">
            {noteBlocks(digest.summary).map((b, i) =>
              b.kind === 'heading' ? <h3 key={i} className="mt-4 font-semibold text-garden-deep first:mt-0">{b.text}</h3>
              : b.kind === 'list' ? <ul key={i} className="mt-1 list-disc space-y-1 pl-5">{b.items.map((t, j) => <li key={j}>{t}</li>)}</ul>
              : <p key={i} className="mt-1">{b.text}</p>)}
          </article>
        ) : (
          <p className="mt-3 text-stone-600">No note yet today. Remi writes one every evening at 8 pm, or you can ask for it now.</p>
        )}
        <WriteNoteButton hasNote={Boolean(digest)} />

        {newStories.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-semibold">New stories this week</h2>
            <div className="mt-3 space-y-3">{newStories.map((m) => <MemoryCard key={m.id} m={m} name={name} />)}</div>
            <Link href="/family/story" className="mt-2 inline-block text-sm text-garden underline">All of {name}&apos;s story</Link>
          </>
        )}

        <h2 className="mt-10 text-xl font-semibold">What {name} talked about</h2>
        <ul className="mt-3 space-y-3">
          {(talk ?? []).map((e, i) => {
            const c = e.payload as Convo;
            return (
              <li key={i} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
                  <span>{when(e.created_at)}</span>
                  {c.mood && c.mood !== 'unknown' && <span className={`rounded-full px-2 py-0.5 text-stone-800 ${MOOD_STYLE[c.mood] ?? 'bg-stone-100'}`}>{c.mood}</span>}
                  {c.sensitiveTopic && <span className="rounded-full bg-garden px-2 py-0.5 text-white">your guidance used: {c.sensitiveTopic}</span>}
                </div>
                <p className="mt-2"><span className="text-stone-500">{name}:</span> {c.text}</p>
                <p className="mt-1"><span className="text-stone-500">Remi:</span> {c.reply}</p>
              </li>
            );
          })}
          {!talk?.length && <li className="text-stone-600">Nothing yet. Conversations on the tablet appear here.</li>}
        </ul>
      </section>

      <aside className="order-1 lg:order-2">
        <h2 className="text-xl font-semibold">Alerts</h2>
        <ul className="mt-3 space-y-2">
          {(alerts ?? []).map((a, i) => {
            const p = a.payload as { reason: string; detail: string };
            return (
              <li key={i} className="rounded-xl border-l-4 border-alarm bg-white p-3">
                <p className="font-medium">{REASON[p.reason] ?? p.reason}</p>
                <p className="text-sm text-stone-700">{p.detail}</p>
                <p className="mt-1 text-xs text-stone-500">{when(a.created_at)}</p>
              </li>
            );
          })}
          {!alerts?.length && <li className="text-stone-600">No alerts. All calm.</li>}
        </ul>
      </aside>
    </div>
  );
}
