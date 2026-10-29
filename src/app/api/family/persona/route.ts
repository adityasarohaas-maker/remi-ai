import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { supabaseDeps } from '@/lib/deps';
import { chatStream, MODELS, type ChatMessage } from '@/lib/claude';
import { cloudVoiceConfigured, synthesize, VOICE_PER_MIN } from '@/lib/azure-tts';
import { createSpokenReply } from '@/core/stream-speech';
import { buildPersonaPrompt, pickPersonaMemories, type PersonaMemory } from '@/core/persona-prompt';
import { voiceLocale } from '@/core/voices';

export const maxDuration = 60;
const PERSONA_PER_MIN = 20;
const MAX_INPUT = 500;

/**
 * Talk with her: streams {say, audio} lines like the tablet's talk route. Family session only, and only
 * when she allowed it and has passed. Every memory is read with the viewer's own client (RLS).
 */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: 'sign in' }, { status: 401 });
  const { data: member } = await sb.from('household_members').select('household_id, display_name').eq('user_id', user.id).maybeSingle();
  if (!member) return Response.json({ error: 'no household' }, { status: 403 });
  const householdId = member.household_id as string;
  const [{ data: h }, { data: consent }] = await Promise.all([
    sb.from('households').select('preferred_name, about, language, status').eq('id', householdId).single(),
    sb.from('consents').select('allow_persona').eq('household_id', householdId).maybeSingle(),
  ]);
  if (!h || h.status !== 'passed' || !consent?.allow_persona) return Response.json({ error: 'not allowed' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { text?: unknown; history?: unknown } | null;
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_INPUT) : '';
  if (!text) return Response.json({ error: 'empty' }, { status: 400 });
  const deps = supabaseDeps();
  if (!(await deps.takeRateToken(householdId, 'persona', PERSONA_PER_MIN, 60))) return Response.json({ error: 'too many requests' }, { status: 429 });

  const { data: rows } = await sb.from('memories').select('id, title, quote, year_from, confidence, verified_by, created_at').eq('household_id', householdId).limit(400);
  const memories = pickPersonaMemories(((rows ?? []) as { id: string; title: string; quote: string; year_from: number | null; confidence: 'sure' | 'unsure'; verified_by: string | null; created_at: string }[])
    .map((r): PersonaMemory => ({ id: r.id, title: r.title, quote: r.quote, year: r.year_from, confidence: r.confidence, verifiedBy: r.verified_by, createdAt: r.created_at })));
  const history = Array.isArray(body?.history)
    ? (body!.history as unknown[]).filter((t): t is { role: 'user' | 'assistant'; content: string } =>
      !!t && typeof t === 'object' && ((t as { role?: unknown }).role === 'user' || (t as { role?: unknown }).role === 'assistant') && typeof (t as { content?: unknown }).content === 'string').slice(-10)
    : [];
  const messages: ChatMessage[] = [
    { role: 'system', content: buildPersonaPrompt({ name: h.preferred_name, about: h.about, memories, viewerName: (member.display_name as string | null) ?? 'a family member' }) },
    ...history.map((t) => ({ role: t.role, content: t.content.slice(0, MAX_INPUT) })),
    { role: 'user', content: text },
  ];

  const voiced = cloudVoiceConfigured();
  const synth = async (s: string) => {
    if (!(await deps.takeRateToken(householdId, 'voice', VOICE_PER_MIN, 60))) return null;
    return synthesize(s, voiceLocale(s, h.language as string));
  };
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (o: unknown) => { if (!open) return; try { controller.enqueue(encoder.encode(JSON.stringify(o) + '\n')); } catch { open = false; } };
      try {
        const speaker = voiced ? createSpokenReply({ synth, send }) : null;
        const reply = await chatStream(messages, { model: MODELS.deep(), maxTokens: 400, effort: 'medium', timeoutMs: 40_000 },
          (delta) => { if (speaker) speaker.delta(delta); else send({ delta }); });
        await speaker?.finish();
        // a persona turn is never a memory: it is kept apart from her real words
        await deps.logEvent(householdId, 'persona', { by: user.id, text, reply });
        send({ done: true, reply });
      } catch (e) {
        console.error('persona failed', (e as Error).message);
        send({ done: true, reply: null, error: 'failed' });
      }
      if (open) { try { controller.close(); } catch { /* gone */ } }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store, no-transform' } });
}
