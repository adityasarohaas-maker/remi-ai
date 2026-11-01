import { requireFamily } from '@/lib/household';
import { localParts, safeTimeZone } from '@/core/time';
import { noteBlocks } from '@/core/note-blocks';
import Link from 'next/link';
import { WriteNoteButton } from './write-note';
import { memoryFromRow, MEMORY_COLUMNS, type MemoryDbRow } from '@/core/memory-row';
import { MemoryCard } from './story/memory-card';
import { CARE_LABEL, type CareKind } from '@/core/care-signals';
import { supabaseAdmin } from '@/lib/supabase/server';
import { showableTurns, type TranscriptEvent } from '@/core/transcript';

const REASON: Record<string, string> = {
  safety: 'Safety words heard',
  call_request: 'Asked for a call',
  help_button: 'Pressed “I need help”',
  message: 'A message from Remi',
};

const MOOD_STYLE: Record<string, string> = {
  calm: 'bg-leaf', happy: 'bg-leaf', confused: 'bg-garden/25', anxious: 'bg-garden/25', sad: 'bg-panel', agitated: 'bg-alarm/20',
};

type Convo = { text: string; reply: string; mood?: string; sensitiveTopic?: string | null };

export default async function FamilyHome() {
  const { sb, householdId } = await requireFamily();
  const { data: h } = await sb.from('households').select('preferred_name, timezone, extracted_through').eq('id', householdId).single();
  const tz = safeTimeZone(h?.timezone);
  const now = new Date();
  const today = localParts(now, tz).day;
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: alerts }, { data: digest }, { data: talk }, { data: fresh }, { data: signals }] = await Promise.all([
    sb.from('events').select('payload, created_at').eq('household_id', householdId).eq('type', 'alert').order('created_at', { ascending: false }).limit(10),
    sb.from('digests').select('summary, created_at').eq('household_id', householdId).eq('day', today).maybeSingle(),
    // members can't read transcripts directly; the server hands over only what she hasn't kept back
    supabaseAdmin().from('events').select('id, payload, created_at').eq('household_id', householdId).eq('type', 'conversation')
      .lte('id', (h?.extracted_through as number | undefined) ?? 0).order('id', { ascending: false }).limit(30),
    sb.from('memories').select(MEMORY_COLUMNS).eq('household_id', householdId).gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(3),
    sb.from('care_signals').select('kind, detail, created_at').eq('household_id', householdId).gte('created_at', dayStart).order('created_at', { ascending: false }).limit(10),
  ]);
  const newStories = ((fresh ?? []) as MemoryDbRow[]).map(memoryFromRow);
  const turns = showableTurns((talk ?? []) as TranscriptEvent[], (h?.extracted_through as number | undefined) ?? 0).slice(0, 10);
  const when = (iso: string) => {
    const p = localParts(new Date(iso), tz);
    return p.day === today ? p.prettyTime : `${p.prettyTime}, ${p.prettyDate}`;
  };
  const name = h?.preferred_name ?? '';

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="order-2 lg:order-1">
        <h1 className="f-h1">Evening note</h1>
        {digest ? (
          <article className="mt-3 max-w-prose rounded-xl border bg-surface p-5 leading-relaxed">
            {noteBlocks(digest.summary).map((b, i) =>
              b.kind === 'heading' ? <h3 key={i} className="mt-4 font-semibold text-garden first:mt-0">{b.text}</h3>
              : b.kind === 'list' ? <ul key={i} className="mt-1 list-disc space-y-1 pl-5">{b.items.map((t, j) => <li key={j}>{t}</li>)}</ul>
              : <p key={i} className="mt-1">{b.text}</p>)}
          </article>
        ) : (
          <p className="mt-3 text-dim">No note yet today. Remi writes one every evening at 8 pm, or you can ask for it now.</p>
        )}
        <WriteNoteButton hasNote={Boolean(digest)} />

        {newStories.length > 0 && (
          <>
            <h2 className="mt-10 f-h2">New stories this week</h2>
            <div className="mt-3 space-y-3">{newStories.map((m) => <MemoryCard key={m.id} m={m} name={name} />)}</div>
            <Link href="/family/story" className="mt-2 inline-block text-sm text-garden underline">All of {name}&apos;s story</Link>
          </>
        )}

        <h2 className="mt-10 f-h2">What {name} talked about</h2>
        <ul className="mt-3 space-y-3">
          {turns.map((e, i) => {
            const c = e.payload as Convo;
            return (
              <li key={i} className="rounded-xl border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-dim">
                  <span>{when(e.created_at)}</span>
                  {c.mood && c.mood !== 'unknown' && <span className={`rounded-full px-2 py-0.5 text-ink ${MOOD_STYLE[c.mood] ?? 'bg-panel'}`}>{c.mood}</span>}
                  {c.sensitiveTopic && <span className="rounded-full bg-garden px-2 py-0.5 text-night">your guidance used: {c.sensitiveTopic}</span>}
                </div>
                <p className="mt-2"><span className="text-dim">{name}:</span> {c.text}</p>
                <p className="mt-1"><span className="text-dim">Remi:</span> {c.reply}</p>
              </li>
            );
          })}
          {!turns.length && <li className="text-dim">Nothing yet. Conversations appear here once Remi has gone through them overnight, leaving out anything {name} asked to keep.</li>}
        </ul>
      </section>

      <aside className="order-1 lg:order-2">
        <h2 className="f-h2">Alerts</h2>
        <ul className="mt-3 space-y-2">
          {(alerts ?? []).map((a, i) => {
            const p = a.payload as { reason: string; detail: string };
            return (
              <li key={i} className="rounded-xl border-l-4 border-alarm bg-surface p-3">
                <p className="font-medium">{REASON[p.reason] ?? p.reason}</p>
                <p className="text-sm text-ink">{p.detail}</p>
                <p className="mt-1 text-xs text-dim">{when(a.created_at)}</p>
              </li>
            );
          })}
          {!alerts?.length && <li className="text-dim">No alerts. All calm.</li>}
        </ul>
        {(signals ?? []).length > 0 && (
          <>
            <h2 className="mt-8 f-h2">Worth a look</h2>
            <ul className="mt-3 space-y-2">
              {(signals ?? []).map((s, i) => (
                <li key={i} className="rounded-xl border-l-4 border-marigold bg-surface p-3">
                  <p className="font-medium">{CARE_LABEL[s.kind as CareKind] ?? s.kind}</p>
                  <p className="text-sm text-ink">“{s.detail}”</p>
                  <p className="mt-1 text-xs text-dim">{when(s.created_at)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
