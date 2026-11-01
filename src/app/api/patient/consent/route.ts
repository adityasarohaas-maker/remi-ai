import { requireLivingDevice } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isUuid } from '@/core/recording';

/** Her spoken answer to Remi's one question: may it keep her voice and her stories. */
export async function POST(req: Request) {
  const householdId = await requireLivingDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { answer?: unknown; recordingId?: unknown; said?: unknown } | null;
  if (body?.answer !== 'yes' && body?.answer !== 'no') return Response.json({ error: 'bad request' }, { status: 400 });
  const db = supabaseAdmin();
  // Remi asks once. Whoever holds the tablet link must not be able to rewrite a decision in her name.
  const { data: decided } = await db.from('consents').select('decided_at').eq('household_id', householdId).maybeSingle();
  if (decided?.decided_at) return Response.json({ error: 'already decided' }, { status: 409 });
  const { data: h } = await db.from('households').select('preferred_name').eq('id', householdId).single();
  const recordingId = body.answer === 'yes' && isUuid(body.recordingId) ? body.recordingId : null;
  const { error } = await db.from('consents').upsert({
    household_id: householdId, record_voice: body.answer === 'yes',
    decided_by: 'person', decided_by_name: h?.preferred_name ?? null, recording_id: recordingId, decided_at: new Date().toISOString(),
  });
  if (error) { console.error('consent save failed', error.message); return Response.json({ error: 'save failed' }, { status: 500 }); }
  await db.from('events').insert({ household_id: householdId, type: 'consent', payload: { answer: body.answer, said: typeof body.said === 'string' ? body.said.slice(0, 300) : null } });
  return Response.json({ ok: true });
}
