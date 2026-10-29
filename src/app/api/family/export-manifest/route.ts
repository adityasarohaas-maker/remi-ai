import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { canAdmin, type Role } from '@/core/roles';
import { memoryFromRow, MEMORY_COLUMNS, type MemoryDbRow } from '@/core/memory-row';

const URL_SECONDS = 600;

/**
 * Everything an admin may take away: memories as JSON, every recording and photo as a signed link.
 * Memories are read with the viewer's own client, so the archive holds what they may see and no more.
 */
export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: 'sign in' }, { status: 401 });
  const { data: member } = await sb.from('household_members').select('household_id, role').eq('user_id', user.id).maybeSingle();
  if (!member || !canAdmin(member.role as Role)) return Response.json({ error: 'admins only' }, { status: 403 });
  const householdId = member.household_id as string;
  const db = supabaseAdmin();

  const [{ data: h }, { data: rows }, { data: consent }, { data: photos }, { data: recordings }] = await Promise.all([
    sb.from('households').select('patient_name, preferred_name, language, timezone, about, care_type, status, passed_on').eq('id', householdId).single(),
    sb.from('memories').select(MEMORY_COLUMNS).eq('household_id', householdId).order('created_at'),
    sb.from('consents').select('*').eq('household_id', householdId).maybeSingle(),
    sb.from('photos').select('id, storage_path, note, year, created_at').eq('household_id', householdId),
    db.from('recordings').select('id, storage_path, mime, transcript, language, created_at').eq('household_id', householdId).order('created_at'),
  ]);
  const memories = ((rows ?? []) as MemoryDbRow[]).map(memoryFromRow);
  // only the clips behind memories this viewer may see, plus the clip of her consent
  const allowed = new Set(memories.map((m) => m.recordingId).filter(Boolean));
  if (consent?.recording_id) allowed.add(consent.recording_id as string);
  const clips = (recordings ?? []).filter((r) => allowed.has(r.id as string));

  const audio = await Promise.all(clips.map(async (r) => {
    const { data } = await db.storage.from('voice').createSignedUrl(r.storage_path as string, URL_SECONDS);
    return { id: r.id, file: `audio/${r.id}.${String(r.mime).includes('mp4') ? 'm4a' : String(r.mime).includes('ogg') ? 'ogg' : 'webm'}`, url: data?.signedUrl ?? null, transcript: r.transcript, language: r.language, createdAt: r.created_at };
  }));
  const pics = await Promise.all((photos ?? []).map(async (p) => {
    const { data } = await sb.storage.from('family-media').createSignedUrl(p.storage_path as string, URL_SECONDS);
    const ext = String(p.storage_path).split('.').pop() ?? 'jpg';
    return { id: p.id, file: `photos/${p.id}.${ext}`, url: data?.signedUrl ?? null, note: p.note, year: p.year, createdAt: p.created_at };
  }));

  await db.from('events').insert({ household_id: householdId, type: 'export', payload: { by: user.id, memories: memories.length, clips: audio.length, photos: pics.length } });
  return Response.json({
    exportedAt: new Date().toISOString(),
    household: h, consent: consent ?? null,
    memories, audio, photos: pics,
  }, { headers: { 'cache-control': 'no-store' } });
}
