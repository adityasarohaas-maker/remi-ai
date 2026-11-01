import { requireFamily } from '@/lib/household';
import { revokeDevice } from './actions';
import { NewDevice } from './new-device';
import { isDemoHousehold } from '@/core/demo';
import { canAdmin } from '@/core/roles';

export default async function TabletPage() {
  const { sb, householdId, role } = await requireFamily();
  const admin = canAdmin(role);
  const { data: devices } = await sb.from('devices').select('id, label, created_at, revoked_at').eq('household_id', householdId).order('created_at', { ascending: false });
  return (
    <section>
      <h1 className="f-h1">Tablet</h1>
      <p className="mt-1 max-w-2xl text-dim">Each tablet gets its own private link. No password is needed on the tablet. You can switch a tablet off here at any time.</p>
      {admin ? <NewDevice /> : <p className="mt-6 max-w-2xl rounded-xl border bg-surface p-4 text-dim">A tablet link can hear her stories and speak as her, so only an owner or admin can make one or switch one off. Ask them to set up a tablet.</p>}
      {admin && <ul className="mt-6 max-w-xl divide-y rounded-xl border bg-surface">
        {(devices ?? []).map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 p-3">
            <span>
              {d.label}
              <span className="ml-2 text-sm text-dim">since {new Date(d.created_at).toLocaleDateString('en-IN')}</span>
              {d.revoked_at && <span className="ml-2 rounded bg-panel px-2 text-xs">switched off</span>}
            </span>
            {admin && !d.revoked_at && !isDemoHousehold(householdId) && (
              <form action={revokeDevice}>
                <input type="hidden" name="id" value={d.id} />
                <button className="text-sm text-alarm underline">Switch off</button>
              </form>
            )}
          </li>
        ))}
        {admin && !devices?.length && <li className="p-3 text-dim">No tablets yet.</li>}
      </ul>}
    </section>
  );
}
