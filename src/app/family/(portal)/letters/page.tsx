import { requireFamily } from '@/lib/household';
import { memoryFromRow, MEMORY_COLUMNS, type MemoryDbRow } from '@/core/memory-row';
import { MemoryCard } from '../story/memory-card';

/** Letters and sealed memories that have opened for this viewer. What is still to come lives on the Story page. */
export default async function LettersPage() {
  const { sb, householdId } = await requireFamily();
  const [{ data: h }, { data: rows }] = await Promise.all([
    sb.from('households').select('preferred_name').eq('id', householdId).single(),
    sb.from('memories').select(MEMORY_COLUMNS).eq('household_id', householdId)
      .or('kind.eq.letter,opened_at.not.is.null').order('opened_at', { ascending: false }),
  ]);
  const name = h?.preferred_name ?? '';
  const letters = ((rows ?? []) as MemoryDbRow[]).map(memoryFromRow);
  return (
    <div>
      <h1 className="f-h1">Letters from {name}</h1>
      <p className="mt-1 text-dim">What she sealed and has now opened, and what she left for particular people. Only what you may see is shown here.</p>
      <div className="mt-6 space-y-4">
        {letters.map((m) => <MemoryCard key={m.id} m={m} name={name} />)}
        {!letters.length && <p className="text-dim">Nothing has opened for you yet. Sealed items and the days they wait for are listed under Story.</p>}
      </div>
    </div>
  );
}
