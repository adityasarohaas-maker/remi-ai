import { requireFamily } from '@/lib/household';
import { groupIntoChapters } from '@/core/chapters';
import { memoryFromRow, MEMORY_COLUMNS, type MemoryDbRow } from '@/core/memory-row';
import { MemoryCard } from './memory-card';
import { ComingLater, type SealedItem } from './events';
import { supabaseAdmin } from '@/lib/supabase/server';
import { canAdmin } from '@/core/roles';
import type { Visibility } from '@/core/types';

const SEALED_LABEL: Record<string, string> = {
  members: 'for particular family members',
  after_death: "to open after she's gone",
  on_date: 'sealed until a date',
  on_event: 'sealed until a day the family marks',
};

export default async function StoryPage() {
  const { sb, householdId, role } = await requireFamily();
  const [{ data: h }, { data: rows }, { data: sealed }, { data: members }, { data: events }, { data: sealedRows }] = await Promise.all([
    sb.from('households').select('preferred_name').eq('id', householdId).single(),
    sb.from('memories').select(MEMORY_COLUMNS).eq('household_id', householdId).order('created_at'),
    sb.rpc('count_sealed', { p_household: householdId }),
    sb.from('household_members').select('user_id, display_name').eq('household_id', householdId),
    sb.from('life_events').select('id, name, happened_on').eq('household_id', householdId).order('created_at'),
    // the rules of sealed memories, never their words: the service role reads only the columns that say who and when
    supabaseAdmin().from('memories').select('id, kind, title, visibility, visible_to, open_on, open_event_id, opened_at, recipient_name, recipient_email')
      .eq('household_id', householdId).in('visibility', ['members', 'after_death', 'on_date', 'on_event']).order('created_at'),
  ]);
  const names = Object.fromEntries((members ?? []).map((m) => [m.user_id as string, (m.display_name as string | null) ?? 'a family member']));
  const visibleIds = new Set(((rows ?? []) as MemoryDbRow[]).map((r) => r.id));
  const sealedItems: SealedItem[] = ((sealedRows ?? []) as { id: string; kind: string; title: string; visibility: Visibility; visible_to: string[]; open_on: string | null; open_event_id: string | null; opened_at: string | null; recipient_name: string | null; recipient_email: string | null }[])
    .filter((r) => !visibleIds.has(r.id) || r.recipient_name)
    .map((r) => ({ id: r.id, kind: r.kind, title: visibleIds.has(r.id) ? r.title : null, visibility: r.visibility, visibleTo: r.visible_to ?? [], openOn: r.open_on, openEventId: r.open_event_id, openedAt: r.opened_at, recipientName: r.recipient_name, recipientEmail: r.recipient_email }));
  const name = h?.preferred_name ?? '';
  const chapters = groupIntoChapters(((rows ?? []) as MemoryDbRow[]).map(memoryFromRow));
  const sealedList = ((sealed ?? []) as { visibility: string; n: number }[]).filter((s) => s.n > 0);
  const sealedTotal = sealedList.reduce((a, s) => a + Number(s.n), 0);

  return (
    <div>
      <h1 className="f-h1">{name}&apos;s story</h1>
      <p className="mt-1 text-dim">What she has told Remi, in her own words. Mark anything that doesn&apos;t sound right as unsure.</p>
      {sealedTotal > 0 && (
        <p className="mt-4 rounded-xl border border-dashed bg-surface p-4 text-sm text-dim">
          {sealedTotal} {sealedTotal === 1 ? 'memory is' : 'memories are'} sealed: {sealedList.map((s) => `${s.n} ${SEALED_LABEL[s.visibility] ?? s.visibility}`).join(', ')}.
        </p>
      )}
      {chapters.length === 0 && <p className="mt-8 text-dim">Nothing kept yet. Stories appear here after she talks with Remi.</p>}
      <ComingLater sealed={sealedItems} events={(events ?? []) as { id: string; name: string; happened_on: string | null }[]} names={names} admin={canAdmin(role)} name={name} />
      {chapters.map((c) => (
        <section key={c.stage} className="mt-10">
          <h2 className="f-h2">{c.title}</h2>
          {c.stage === 'wishes' && <p className="mt-1 text-sm text-dim">These are {name}&apos;s wishes in her own words. They are not a legal will.</p>}
          <div className="mt-4 space-y-4">
            {c.memories.map((m) => <MemoryCard key={m.id} m={m} name={name} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
