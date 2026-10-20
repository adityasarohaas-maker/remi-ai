import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { supabaseAdmin } from '@/lib/supabase/server';
import { cloudVoiceConfigured, synthesize, VOICE_PER_MIN } from '@/lib/azure-tts';
import { handleTalk, type TalkMode } from '@/core/talk';
import { createSpokenReply } from '@/core/stream-speech';
import { isSupportedLanguage, voiceLocale } from '@/core/voices';

export async function POST(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: unknown; mode?: unknown; language?: unknown; voice?: unknown } | null;
  const clientKey = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
  const input = {
    householdId,
    text: typeof body?.text === 'string' ? body.text : '',
    mode: (body?.mode === 'overheard' || body?.mode === 'followup' ? body.mode : 'addressed') as TalkMode,
    clientKey,
    language: typeof body?.language === 'string' ? body.language : undefined, // checked in handleTalk
  };

  if (!req.headers.get('accept')?.includes('application/x-ndjson')) {
    const result = await handleTalk(supabaseDeps(), input);
    return Response.json(result.body, { status: result.status });
  }

  const deps = supabaseDeps();
  // voice: true = the tablet wants Remi's voice made here, sentence by sentence as the reply is written,
  // instead of fetching each clip itself afterwards (one round trip less before Remi speaks).
  const voiced = body?.voice === true && cloudVoiceConfigured();
  const voiceLanguage = !voiced ? null
    : input.language && isSupportedLanguage(input.language) ? Promise.resolve(input.language)
      : Promise.resolve(supabaseAdmin().from('households').select('language').eq('id', householdId).single())
        .then(({ data }) => (data?.language as string | undefined) ?? 'en-US');
  const synth = async (text: string) => {
    const audio = synthesize(text, voiceLocale(text, await voiceLanguage!));
    audio.catch(() => {}); // handled by the caller; never an unhandled rejection when the limit says no
    if (!(await deps.takeRateToken(householdId, 'voice', VOICE_PER_MIN, 60))) return null;
    return audio;
  };

  // Streaming: one JSON line per piece of the reply — { delta } for text, or { say, audio } when the
  // server voices it — then the final result ({ done: true, ... }).
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // The tablet may stop reading mid-reply (screen changed, page closed); then stop sending quietly.
      // handleTalk still finishes, so the turn is saved and any alert still goes out.
      let open = true;
      const send = (o: unknown) => {
        if (!open) return;
        try { controller.enqueue(encoder.encode(JSON.stringify(o) + '\n')); } catch { open = false; }
      };
      try {
        const speaker = voiced ? createSpokenReply({ synth, send }) : null;
        let streamed = false;
        const result = await handleTalk(deps, {
          ...input,
          onDelta: (delta) => { streamed = true; if (speaker) speaker.delta(delta); else send({ delta }); },
        });
        const reply = (result.body as { reply?: string | null }).reply;
        // fallback, clock or family words arrive whole, without a stream: voice them whole
        if (speaker && !streamed && reply) speaker.delta(reply);
        await speaker?.finish();
        send({ done: true, status: result.status, ...result.body });
      } catch (e) {
        console.error('talk stream failed', e);
        send({ done: true, status: 500, reply: null });
      }
      if (open) { try { controller.close(); } catch { /* the tablet already went away */ } }
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store, no-transform' },
  });
}

/** A wake-up call: the tablet sends one when she starts speaking, so the reply isn't slowed by a cold start. */
export function GET() {
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
