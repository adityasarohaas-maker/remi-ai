import { requireFamily } from '@/lib/household';
import { canAdmin } from '@/core/roles';
import { ExportButton } from './export-button';

export default async function ExportPage() {
  const { sb, householdId, role } = await requireFamily();
  const [{ data: h }, { count: memories }, { count: clips }] = await Promise.all([
    sb.from('households').select('preferred_name').eq('id', householdId).single(),
    sb.from('memories').select('id', { count: 'exact', head: true }).eq('household_id', householdId),
    sb.from('memories').select('id', { count: 'exact', head: true }).eq('household_id', householdId).not('recording_id', 'is', null),
  ]);
  const name = h?.preferred_name ?? '';
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">You keep everything</h1>
      <p className="mt-1 text-stone-600">
        {name}&apos;s voice, her words, the photos and the book, as one file, any time you like. It is yours: if Remi ever went away, nothing of hers would go with it.
      </p>
      <p className="mt-3 text-sm text-stone-500">{memories ?? 0} memories you can see, {clips ?? 0} with her voice. The zip holds <code>memories.json</code>, <code>audio/</code>, <code>transcripts/</code>, <code>photos/</code> and <code>book.html</code>.</p>
      <div className="mt-6">
        {canAdmin(role) ? <ExportButton name={name} /> : <p className="text-sm text-stone-500">Ask an owner or admin of the family to download the archive.</p>}
      </div>
    </div>
  );
}
