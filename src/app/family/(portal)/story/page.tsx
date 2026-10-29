import { requireFamily } from '@/lib/household';
import { groupIntoChapters } from '@/core/chapters';
import { memoryFromRow, MEMORY_COLUMNS, type MemoryDbRow } from '@/core/memory-row';
import { MemoryCard } from './memory-card';

const SEALED_LABEL: Record<string, string> = {
  members: 'for particular family members',
  after_death: "to open after she's gone",
  on_date: 'sealed until a date',
  on_event: 'sealed until a day the family marks',
};

export default async function StoryPage() {
  const { sb, householdId } = await requireFamily();
  const [{ data: h }, { data: rows }, { data: sealed }] = await Promise.all([
    sb.from('households').select('preferred_name').eq('id', householdId).single(),
    sb.from('memories').select(MEMORY_COLUMNS).eq('household_id', householdId).order('created_at'),
    sb.rpc('count_sealed', { p_household: householdId }),
  ]);
  const name = h?.preferred_name ?? '';
  const chapters = groupIntoChapters(((rows ?? []) as MemoryDbRow[]).map(memoryFromRow));
  const sealedList = ((sealed ?? []) as { visibility: string; n: number }[]).filter((s) => s.n > 0);
  const sealedTotal = sealedList.reduce((a, s) => a + Number(s.n), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{name}&apos;s story</h1>
      <p className="mt-1 text-stone-600">What she has told Remi, in her own words. Mark anything that doesn&apos;t sound right as unsure.</p>
      {sealedTotal > 0 && (
        <p className="mt-4 rounded-xl border border-dashed bg-white p-4 text-sm text-stone-600">
          {sealedTotal} {sealedTotal === 1 ? 'memory is' : 'memories are'} sealed: {sealedList.map((s) => `${s.n} ${SEALED_LABEL[s.visibility] ?? s.visibility}`).join(', ')}.
        </p>
      )}
      {chapters.length === 0 && <p className="mt-8 text-stone-600">Nothing kept yet. Stories appear here after she talks with Remi.</p>}
      {chapters.map((c) => (
        <section key={c.stage} className="mt-10">
          <h2 className="text-xl font-semibold">{c.title}</h2>
          {c.stage === 'wishes' && <p className="mt-1 text-sm text-stone-600">These are {name}&apos;s wishes in her own words. They are not a legal will.</p>}
          <div className="mt-4 space-y-4">
            {c.memories.map((m) => <MemoryCard key={m.id} m={m} name={name} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
