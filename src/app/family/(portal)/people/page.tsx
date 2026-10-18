import { requireFamily } from '@/lib/household';
import { addPerson, deletePerson } from './actions';
import { FaceEnroll } from './face-enroll';

export default async function PeoplePage() {
  const { sb, householdId } = await requireFamily();
  const { data: people } = await sb.from('people')
    .select('id, name, relation, notes, is_deceased, face_embeddings(count)')
    .eq('household_id', householdId).order('created_at');
  return (
    <section>
      <h1 className="text-2xl font-semibold">People</h1>
      <p className="mt-1 text-stone-600">Everyone Remi should recognise and be able to talk about.</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {(people ?? []).map((p) => {
          const faces = (p.face_embeddings as unknown as { count: number }[])[0]?.count ?? 0;
          return (
            <li key={p.id} className="rounded-xl border bg-white p-4">
              <p className="text-lg font-medium">
                {p.name} <span className="text-stone-500">· {p.relation}</span>
                {p.is_deceased && <span className="ml-2 rounded bg-stone-200 px-2 text-xs">passed away</span>}
              </p>
              {p.notes && <p className="mt-1 text-stone-700">{p.notes}</p>}
              <p className="mt-2 text-sm text-stone-500">{faces} face photo{faces === 1 ? '' : 's'}</p>
              <FaceEnroll personId={p.id} householdId={householdId} />
              <form action={deletePerson} className="mt-3">
                <input type="hidden" name="id" value={p.id} />
                <button className="text-sm text-red-700 underline">Remove</button>
              </form>
            </li>
          );
        })}
      </ul>
      <form action={addPerson} className="mt-8 max-w-lg space-y-3 rounded-xl border bg-white p-4">
        <h2 className="font-medium">Add someone</h2>
        <input name="name" required placeholder="Name" className="w-full rounded-lg border px-3 py-2" />
        <input name="relation" required placeholder="Relation to them, e.g. grandson" className="w-full rounded-lg border px-3 py-2" />
        <textarea name="notes" rows={3} placeholder="Something to talk about, e.g. loves cricket" className="w-full rounded-lg border px-3 py-2" />
        <label className="flex items-center gap-2"><input type="checkbox" name="is_deceased" /> Has passed away</label>
        <button className="rounded-lg bg-teal-800 px-4 py-2 text-white">Add</button>
      </form>
    </section>
  );
}
