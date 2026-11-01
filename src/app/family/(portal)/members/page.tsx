import { requireFamily } from '@/lib/household';
import { canAdmin, canInvite } from '@/core/roles';
import { InviteForm } from './invite-form';
import { removeMember, cancelInvite } from './actions';

export default async function MembersPage() {
  const { sb, householdId, role, user } = await requireFamily();
  const [members, invites] = await Promise.all([
    sb.from('household_members').select('user_id, role, display_name, email').eq('household_id', householdId),
    canAdmin(role) ? sb.from('invites').select('id, email, display_name, role, expires_at, accepted_at').eq('household_id', householdId).is('accepted_at', null).order('created_at') : Promise.resolve({ data: [] as { id: string; email: string; display_name: string; role: string; expires_at: string; accepted_at: string | null }[] }),
  ]);
  const order = { owner: 0, admin: 1, family: 2 } as const;
  const list = [...(members.data ?? [])].sort((a, b) => (order[a.role as keyof typeof order] ?? 3) - (order[b.role as keyof typeof order] ?? 3));

  return (
    <div className="space-y-10">
      <section>
        <h1 className="f-h1">Family members</h1>
        <p className="mt-1 text-dim">Everyone here can hear her stories. Owners and admins look after invites, consent and the archive.</p>
        <ul className="mt-6 divide-y rounded-xl border bg-surface">
          {list.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <div className="font-medium">{m.display_name ?? m.email ?? 'A family member'}{m.user_id === user.id && <span className="ml-2 text-xs text-dim">(you)</span>}</div>
                <div className="text-sm text-dim">{m.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-panel px-3 py-1 text-xs uppercase tracking-wide text-dim">{m.role}</span>
                {canAdmin(role) && m.role !== 'owner' && m.user_id !== user.id && (role === 'owner' || m.role === 'family') && (
                  <form action={removeMember}>
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button className="text-sm text-alarm hover:underline">Remove</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {canAdmin(role) && (
        <section>
          <h2 className="f-h2">Invite someone</h2>
          <p className="mt-1 text-sm text-dim">They get a link that lasts seven days. If email isn&apos;t set up yet, copy the link and send it yourself.</p>
          <InviteForm mayInviteAdmin={canInvite(role, 'admin')} />
          {(invites.data ?? []).length > 0 && (
            <ul className="mt-6 divide-y rounded-xl border bg-surface">
              {(invites.data ?? []).map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span>{i.display_name} · {i.email} · {i.role} · until {new Date(i.expires_at).toLocaleDateString()}</span>
                  <form action={cancelInvite}><input type="hidden" name="id" value={i.id} /><button className="text-alarm hover:underline">Cancel</button></form>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
