import { requireDevice } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';

const URL_SECONDS = 600;

/** The next old photo for her to look at: one the family added that she hasn't seen, else the one seen longest ago. */
export async function GET(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const db = supabaseAdmin();
  const skip = new URL(req.url).searchParams.get('skip');
  let q = db.from('photos').select('id, storage_path, note, year, shown_at').eq('household_id', householdId)
    .order('shown_at', { ascending: true, nullsFirst: true }).order('created_at').limit(2);
  if (skip) q = q.neq('id', skip);
  const { data } = await q;
  const photo = data?.[0];
  if (!photo) return Response.json({ photo: null });
  const { data: signed } = await db.storage.from('family-media').createSignedUrl(photo.storage_path as string, URL_SECONDS);
  if (!signed?.signedUrl) return Response.json({ photo: null });
  await db.from('photos').update({ shown_at: new Date().toISOString() }).eq('id', photo.id);
  return Response.json({ photo: { id: photo.id, url: signed.signedUrl, note: photo.note, year: photo.year } });
}
