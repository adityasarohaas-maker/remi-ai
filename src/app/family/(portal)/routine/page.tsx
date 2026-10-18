import { requireFamily } from '@/lib/household';
import { addRoutine, deleteRoutine } from './actions';

const KIND_LABEL: Record<string, string> = { medicine: 'Medicine', meal: 'Meal', activity: 'Activity' };

export default async function RoutinePage() {
  const { sb, householdId } = await requireFamily();
  const [{ data: items }, { data: h }] = await Promise.all([
    sb.from('routine_items').select('id, time_of_day, kind, label, spoken_message').eq('household_id', householdId).order('time_of_day'),
    sb.from('households').select('preferred_name').eq('id', householdId).single(),
  ]);
  const name = h?.preferred_name ?? 'Kamla';
  return (
    <section>
      <h1 className="text-2xl font-semibold">Daily routine</h1>
      <p className="mt-1 text-stone-600">Remi gently reminds {name} at these times and tells you if something is missed.</p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse bg-white text-left">
          <thead>
            <tr className="border-b text-sm text-stone-500">
              <th className="p-3">Time</th><th className="p-3">Type</th><th className="p-3">What</th><th className="p-3">Remi says</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-3 font-medium tabular-nums">{String(r.time_of_day).slice(0, 5)}</td>
                <td className="p-3">{KIND_LABEL[r.kind] ?? r.kind}</td>
                <td className="p-3">{r.label}</td>
                <td className="p-3 text-stone-600">{r.spoken_message ?? '—'}</td>
                <td className="p-3">
                  <form action={deleteRoutine}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-sm text-red-700 underline">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
            {!items?.length && <tr><td colSpan={5} className="p-3 text-stone-500">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <form action={addRoutine} className="mt-8 grid max-w-2xl gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[8rem_10rem_1fr]">
        <h2 className="font-medium sm:col-span-3">Add to the day</h2>
        <input type="time" name="time_of_day" required className="rounded-lg border px-3 py-2" />
        <select name="kind" className="rounded-lg border px-3 py-2">
          <option value="medicine">Medicine</option>
          <option value="meal">Meal</option>
          <option value="activity">Activity</option>
        </select>
        <input name="label" required placeholder="e.g. BP tablet" className="rounded-lg border px-3 py-2" />
        <input name="spoken_message" placeholder={`${name}, it's time for your blood-pressure tablet with a glass of water.`} className="rounded-lg border px-3 py-2 sm:col-span-3" />
        <button className="justify-self-start rounded-lg bg-garden px-4 py-2 text-white">Add</button>
      </form>
    </section>
  );
}
