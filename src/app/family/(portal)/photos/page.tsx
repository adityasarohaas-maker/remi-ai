import Link from 'next/link';
import { requireFamily } from '@/lib/household';
import { canAdmin } from '@/core/roles';
import { addPhoto, deletePhoto } from './actions';

export default async function PhotosPage() {
  const { sb, householdId, role } = await requireFamily();
  const [{ data: h }, { data: photos }, { data: told }] = await Promise.all([
    sb.from('households').select('preferred_name').eq('id', householdId).single(),
    sb.from('photos').select('id, storage_path, note, year, shown_at, created_at').eq('household_id', householdId).order('created_at', { ascending: false }),
    sb.from('memories').select('id, photo_id, title').eq('household_id', householdId).not('photo_id', 'is', null),
  ]);
  const name = h?.preferred_name ?? '';
  const paths = (photos ?? []).map((p) => p.storage_path as string);
  const { data: signed } = paths.length ? await sb.storage.from('family-media').createSignedUrls(paths, 600) : { data: [] };
  const url = (path: string) => (signed ?? []).find((s) => s.path === path)?.signedUrl ?? null;
  const story = (photoId: string) => (told ?? []).find((m) => m.photo_id === photoId);

  return (
    <div>
      <h1 className="f-h1">Old photos</h1>
      <p className="mt-1 max-w-prose text-dim">Add photos from {name}&apos;s life. Remi shows them on the tablet and asks about the day. A note helps: who, where, roughly when.</p>
      <form action={addPhoto} className="mt-6 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-[1fr_2fr_6rem_auto]">
        <input name="photo" type="file" accept="image/*" required className="text-sm" />
        <input name="note" maxLength={200} placeholder="Wedding day, Ajmer" className="rounded-lg border px-3 py-2" />
        <input name="year" inputMode="numeric" maxLength={4} placeholder="1968" className="rounded-lg border px-3 py-2" />
        <button className="rounded-lg bg-garden px-4 py-2 text-night">Add</button>
      </form>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(photos ?? []).map((p) => {
          const m = story(p.id);
          const src = url(p.storage_path as string);
          return (
            <li key={p.id} className="overflow-hidden rounded-xl border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage URL */}
              {src && <img src={src} alt={p.note ?? ''} className="aspect-[4/3] w-full object-cover" />}
              <div className="p-3 text-sm">
                <p className="font-medium">{p.note ?? 'Untitled'}{p.year ? ` · ${p.year}` : ''}</p>
                <p className="mt-1 text-dim">
                  {m ? <Link href={`/family/story#m-${m.id}`} className="text-garden underline">Story told: {m.title}</Link> : p.shown_at ? 'Shown, no story yet' : 'Not yet shown'}
                </p>
                {canAdmin(role) && (
                  <form action={deletePhoto} className="mt-2"><input type="hidden" name="id" value={p.id} /><button className="text-xs text-alarm hover:underline">Remove</button></form>
                )}
              </div>
            </li>
          );
        })}
        {!photos?.length && <li className="text-dim">No photos yet.</li>}
      </ul>
    </div>
  );
}
