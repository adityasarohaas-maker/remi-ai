import { requireFamily } from '@/lib/household';
import { addGuidance, deleteGuidance } from './actions';

const APPROACH_LABEL: Record<string, string> = {
  redirect: 'Gently change the subject',
  share_memory: 'Share a happy memory',
  call_relative: 'Ask a relative to call',
};

export default async function GuidancePage() {
  const { sb, householdId } = await requireFamily();
  const [{ data: rules }, { data: people }] = await Promise.all([
    sb.from('sensitive_guidance').select('id, topic, trigger_words, approach, family_script, caller:people(name)').eq('household_id', householdId),
    sb.from('people').select('id, name, relation').eq('household_id', householdId).eq('is_deceased', false).order('created_at'),
  ]);
  return (
    <section>
      <h1 className="text-2xl font-semibold">Hard questions</h1>
      <p className="mt-1 max-w-2xl text-stone-600">
        Decide in advance how Remi answers the questions that hurt — like asking for someone who has passed away.
        Remi follows your words, never its own guess.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {(rules ?? []).map((g) => (
          <li key={g.id} className="rounded-xl border bg-white p-4">
            <p className="text-lg font-medium">{g.topic}</p>
            <p className="mt-1 text-sm text-stone-600">{APPROACH_LABEL[g.approach] ?? g.approach}
              {g.approach === 'call_relative' && (g.caller as unknown as { name: string } | null)?.name && ` · ${(g.caller as unknown as { name: string }).name} calls`}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(g.trigger_words as string[]).map((w) => <span key={w} className="rounded bg-stone-100 px-2 py-0.5 text-sm">{w}</span>)}
            </div>
            <blockquote className="mt-3 border-l-4 border-teal-700 pl-3 text-stone-800">“{g.family_script}”</blockquote>
            <form action={deleteGuidance} className="mt-3">
              <input type="hidden" name="id" value={g.id} />
              <button className="text-sm text-red-700 underline">Remove</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={addGuidance} className="mt-8 max-w-xl space-y-3 rounded-xl border bg-white p-4">
        <h2 className="font-medium">Add guidance</h2>
        <label className="block">Topic<input name="topic" required placeholder="e.g. My husband Ramesh" className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="block">Words that bring it up, comma-separated
          <input name="trigger_words" required placeholder="e.g. Ramesh, my husband, पति" className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <fieldset className="space-y-1">
          <legend>How should Remi respond?</legend>
          {Object.entries(APPROACH_LABEL).map(([value, label], i) => (
            <label key={value} className="flex items-center gap-2"><input type="radio" name="approach" value={value} defaultChecked={i === 1} /> {label}</label>
          ))}
        </fieldset>
        <label className="block">What should Remi say?
          <textarea name="family_script" required rows={3} placeholder="e.g. Ramesh loved your Sunday walks to the temple." className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block">Who should call? (only for “Ask a relative to call”)
          <select name="call_person_id" className="mt-1 w-full rounded-lg border px-3 py-2">
            <option value="">—</option>
            {(people ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.relation})</option>)}
          </select>
        </label>
        <button className="rounded-lg bg-teal-800 px-4 py-2 text-white">Add</button>
      </form>
    </section>
  );
}
