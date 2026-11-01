import { requireLivingDevice } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { supabaseDeps } from '@/lib/deps';
import { clipPath, validateClip, isUuid, RECORDINGS_PER_MIN } from '@/core/recording';

/** The tablet's recording of one turn, named by the tablet so the talk request already carries the id. */
export async function POST(req: Request) {
  const householdId = await requireLivingDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });

  const db = supabaseAdmin();
  const { data: consent } = await db.from('consents').select('record_voice').eq('household_id', householdId).maybeSingle();
  if (consent && consent.record_voice === false) return new Response(null, { status: 204 });

  if (!(await supabaseDeps().takeRateToken(householdId, 'recording', RECORDINGS_PER_MIN, 60))) {
    return Response.json({ error: 'too many requests' }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const audio = form?.get('audio');
  const id = form?.get('id');
  if (!(audio instanceof Blob) || !isUuid(id)) return Response.json({ error: 'bad request' }, { status: 400 });
  const check = validateClip(audio.type, audio.size);
  if (check !== 'ok') return Response.json({ error: check }, { status: 400 });
  const transcript = typeof form?.get('transcript') === 'string' ? String(form.get('transcript')).slice(0, 2000) : null;
  const language = typeof form?.get('language') === 'string' ? String(form.get('language')).slice(0, 10) : null;

  const path = clipPath(householdId, new Date(), id);
  const { error: upErr } = await db.storage.from('voice').upload(path, audio, { contentType: audio.type.split(';')[0], upsert: false });
  if (upErr) { console.error('clip upload failed', upErr.message); return Response.json({ error: 'upload failed' }, { status: 500 }); }
  const { error } = await db.from('recordings').insert({
    id, household_id: householdId, storage_path: path, mime: audio.type.split(';')[0], transcript, language,
  });
  if (error) { console.error('recording row failed', error.message); return Response.json({ error: 'save failed' }, { status: 500 }); }
  return Response.json({ id });
}
