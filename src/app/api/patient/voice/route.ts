import { requireDevice } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { supabaseDeps } from '@/lib/deps';
import { cloudVoiceConfigured, synthesize } from '@/lib/azure-tts';
import { isSupportedLanguage } from '@/core/voices';

const MAX_CHARS = 400;      // one sentence or two; Remi speaks a reply a sentence at a time
const VOICE_PER_MIN = 90;   // per household

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
  // Remi answers Hindi in Hindi even in an English household; speak it with the Hindi voice.
  const locale = /[ऀ-ॿ]/.test(text) && !/^(hi|mr)/i.test(household) ? 'hi-IN' : household;
  // Remi is mid-sentence while this runs: check the limit and make the audio at the same time.
  const audio = synthesize(text, locale);
  audio.catch(() => {}); // handled below; never an unhandled rejection when the limit says no
  if (!(await supabaseDeps().takeRateToken(householdId, 'voice', VOICE_PER_MIN, 60))) return new Response(null, { status: 429 });
  try {
    return new Response(await audio, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('voice failed', e);
    return new Response(null, { status: 502 }); // the tablet falls back to its own voice
  }
}

/** Wakes the function before Remi needs it (called as she starts speaking), so the first sentence isn't slow. */
export function GET() {
  return new Response(null, { status: 204 });
}
