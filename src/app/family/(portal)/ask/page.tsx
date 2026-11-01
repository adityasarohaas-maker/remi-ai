import { requireFamily } from '@/lib/household';
import { AskForm } from './ask-form';

export default async function AskPage() {
  const { sb, householdId } = await requireFamily();
  const [{ data: h }, { data: titles }] = await Promise.all([
    sb.from('households').select('preferred_name, status').eq('id', householdId).single(),
    sb.from('memories').select('title').eq('household_id', householdId).order('created_at', { ascending: false }).limit(3),
  ]);
  const name = h?.preferred_name ?? '';
  const suggestions = (titles ?? []).map((t) => `What did ${name} say about ${String(t.title).toLowerCase()}?`);
  return (
    <div className="max-w-2xl">
      <h1 className="f-h1">Ask about {name}</h1>
      <p className="mt-1 text-dim">
        Ask anything. Remi answers only from what {name} herself told it, in her own words, and plays the clip.
        {h?.status === 'passed' ? ' Nothing is invented; some things she simply never told Remi.' : ''}
      </p>
      <div className="mt-6"><AskForm name={name} suggestions={suggestions} /></div>
    </div>
  );
}
