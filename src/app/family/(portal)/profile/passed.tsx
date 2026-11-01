import { markPassed, undoPassed } from './actions';

/** The hardest form in the portal. Admins only; typed confirmation; a day to change their mind. */
export function PassedForm({ name, status, passedOn, canUndo, admin }: {
  name: string; status: 'living' | 'passed'; passedOn: string | null; canUndo: boolean; admin: boolean;
}) {
  if (!admin) return null;
  if (status === 'passed') {
    return (
      <section className="mt-12 max-w-xl rounded-xl border bg-surface p-5">
        <h2 className="f-h2">In memory of {name}</h2>
        <p className="mt-1 text-sm text-dim">Marked as passed{passedOn ? ` on ${passedOn}` : ''}. The portal is now a place to remember her, and what she sealed for after has opened.</p>
        {canUndo ? (
          <form action={undoPassed} className="mt-4"><button className="text-sm text-dim underline">This was a mistake; she is with us</button></form>
        ) : (
          <p className="mt-4 text-xs text-dim">This can no longer be undone: a day has passed, or something she sealed has already been opened.</p>
        )}
      </section>
    );
  }
  return (
    <section className="mt-12 max-w-xl rounded-xl border border-line bg-surface p-5">
      <h2 className="f-h2">When {name} is gone</h2>
      <p className="mt-1 text-sm text-dim">When the time comes, mark it here. The tablet stops its daily talk, the portal becomes a place to remember her, and anything she sealed for after she&apos;s gone opens for the people it was for. You have a day to undo this, unless something sealed has already been opened.</p>
      <form action={markPassed} className="mt-4 space-y-3">
        <label className="block text-sm">Date<input name="passed_on" type="date" required className="mt-1 block rounded-lg border px-3 py-2" /></label>
        <label className="block text-sm">Type her name to confirm<input name="confirm" required placeholder={name} className="mt-1 block w-full rounded-lg border px-3 py-2" /></label>
        <button className="rounded-lg border border-ink/60 px-4 py-2 text-sm">Mark {name} as passed</button>
      </form>
    </section>
  );
}
