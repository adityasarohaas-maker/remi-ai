import { markEventHappened, addRecipientEmail, newLetterLink } from './actions';
import type { MemoryRule } from '@/core/types';
import { sealedLabel } from '@/core/visibility';

export type SealedItem = MemoryRule & { id: string; kind: string; recipientName: string | null; recipientEmail: string | null; openedAt: string | null; title: string | null };

/** What is still to come: sealed memories by their rule (never their content), and the days the family can mark. */
export function ComingLater({ sealed, events, names, admin, name }: {
  sealed: SealedItem[]; events: { id: string; name: string; happened_on: string | null }[];
  names: Record<string, string>; admin: boolean; name: string;
}) {
  const eventNames = Object.fromEntries(events.map((e) => [e.id, e.name]));
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Coming later</h2>
      <p className="mt-1 text-sm text-stone-600">Things {name} sealed. They open on their day, and the people they are for are told.</p>
      <ul className="mt-4 divide-y rounded-xl border border-dashed bg-white">
        {sealed.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              <span className="font-medium">{s.kind === 'letter' ? 'A letter' : 'A memory'}{s.recipientName ? ` for ${s.recipientName}` : ''}</span>
              <span className="text-stone-500"> · {sealedLabel(s, names, eventNames)}</span>
              {s.recipientEmail && <span className="text-stone-400"> · {s.recipientEmail}</span>}
            </span>
            {admin && s.recipientName && !s.recipientEmail && (
              <form action={addRecipientEmail} className="flex gap-2">
                <input type="hidden" name="id" value={s.id} />
                <input name="email" type="email" required placeholder={`${s.recipientName}'s email`} className="rounded-lg border px-2 py-1" />
                <button className="rounded-lg bg-garden px-3 py-1 text-white">Save</button>
              </form>
            )}
            {admin && s.openedAt && s.recipientName && (
              <form action={newLetterLink}><input type="hidden" name="id" value={s.id} /><button className="text-garden underline">Make a link to send</button></form>
            )}
          </li>
        ))}
        {!sealed.length && <li className="px-4 py-3 text-sm text-stone-500">Nothing sealed.</li>}
      </ul>
      {events.length > 0 && (
        <>
          <h3 className="mt-6 font-semibold">Days {name} is waiting for</h3>
          <ul className="mt-2 divide-y rounded-xl border bg-white">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>{e.name}{e.happened_on ? <span className="text-stone-500"> · happened {e.happened_on}</span> : null}</span>
                {admin && !e.happened_on && (
                  <form action={markEventHappened}><input type="hidden" name="id" value={e.id} /><button className="rounded-lg bg-garden px-3 py-1 text-white">It happened today</button></form>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
