import { addCareContact, removeCareContact } from './actions';

/** Nurses, a hospice, a doctor: they get the same alerts as the family, by email. */
export function CareContacts({ contacts, admin }: { contacts: { id: string; name: string; email: string }[]; admin: boolean }) {
  return (
    <section className="mt-12 max-w-xl">
      <h2 className="f-h2">Care team</h2>
      <p className="mt-1 text-sm text-dim">Anyone here is emailed when Remi hears safety words or signs worth a look: pain, breathlessness, fear, not eating, confusion building.</p>
      <ul className="mt-4 divide-y rounded-xl border bg-surface">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>{c.name} · {c.email}</span>
            {admin && <form action={removeCareContact}><input type="hidden" name="id" value={c.id} /><button className="text-alarm hover:underline">Remove</button></form>}
          </li>
        ))}
        {!contacts.length && <li className="px-4 py-3 text-sm text-dim">No care contacts yet.</li>}
      </ul>
      {admin && (
        <form action={addCareContact} className="mt-3 flex gap-2">
          <input name="name" required placeholder="Name" className="flex-1 rounded-lg border px-3 py-2" />
          <input name="email" type="email" required placeholder="Email" className="flex-1 rounded-lg border px-3 py-2" />
          <button className="rounded-lg bg-garden px-4 py-2 text-night">Add</button>
        </form>
      )}
    </section>
  );
}
