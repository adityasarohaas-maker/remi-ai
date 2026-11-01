import { requireDevice } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { supabaseDeps } from '@/lib/deps';
import { cloudVoiceConfigured, synthesize, voiceAllowed } from '@/lib/azure-tts';
import { isSupportedLanguage, voiceLocale } from '@/core/voices';

const MAX_CHARS = 400;      // one sentence or two; Remi speaks a reply a sentence at a time

/** Remi's natural voice for one piece of a reply, as mp3. 204 = no cloud voice: the tablet uses its own. */
export async function POST(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  if (!cloudVoiceConfigured()) return new Response(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { text?: unknown; language?: unknown } | null;
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_CHARS) : '';
  if (!text) return Response.json({ error: 'empty' }, { status: 400 });

  // the language picked on the tablet, else the family's profile language
  const household = typeof body?.language === 'string' && isSupportedLanguage(body.language)
    ? body.language
    : (await supabaseAdmin().from('households').select('language').eq('id', householdId).single()).data?.language ?? 'en-US';
  const locale = voiceLocale(text, household);
  if (!(await voiceAllowed(supabaseDeps().takeRateToken, householdId))) return new Response(null, { status: 429 });
  try {
    return new Response(await synthesize(text, locale), { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('voice failed', e);
    return new Response(null, { status: 502 }); // the tablet falls back to its own voice
  }
}

/** Wakes the function before Remi needs it (called as she starts speaking), so the first sentence isn't slow. */
export function GET() {
  return new Response(null, { status: 204 });
}
