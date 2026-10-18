import { requireFamily } from '@/lib/household';
import { revokeDevice } from './actions';
import { NewDevice } from './new-device';
import { isDemoHousehold } from '@/core/demo';

export default async function TabletPage() {
  const { sb, householdId } = await requireFamily();
  const { data: devices } = await sb.from('devices').select('id, label, created_at, revoked_at').eq('household_id', householdId).order('created_at', { ascending: false });
  return (
    <section>
      <h1 className="text-2xl font-semibold">Tablet</h1>
      <p className="mt-1 max-w-2xl text-stone-600">Each tablet gets its own private link. No password is needed on the tablet. You can switch a tablet off here at any time.</p>
      <NewDevice />
      <ul className="mt-6 max-w-xl divide-y rounded-xl border bg-white">
        {(devices ?? []).map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 p-3">
            <span>
              {d.label}
              <span className="ml-2 text-sm text-stone-500">since {new Date(d.created_at).toLocaleDateString('en-IN')}</span>
              {d.revoked_at && <span className="ml-2 rounded bg-stone-200 px-2 text-xs">switched off</span>}
            </span>
            {!d.revoked_at && !isDemoHousehold(householdId) && (
              <form action={revokeDevice}>
                <input type="hidden" name="id" value={d.id} />
                <button className="text-sm text-red-700 underline">Switch off</button>
              </form>
            )}
          </li>
        ))}
        {!devices?.length && <li className="p-3 text-stone-500">No tablets yet.</li>}
      </ul>
    </section>
  );
}
