import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { handleTalk, type TalkMode } from '@/core/talk';

export async function POST(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: unknown; mode?: unknown; language?: unknown } | null;
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

  // Streaming: one JSON line per piece of the reply ({ delta }), then the final result ({ done: true, ... }).
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
        const result = await handleTalk(supabaseDeps(), { ...input, onDelta: (delta) => send({ delta }) });
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
