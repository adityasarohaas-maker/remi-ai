import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { handleTalk, type TalkMode } from '@/core/talk';

export async function POST(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: unknown; mode?: unknown } | null;
  const clientKey = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
  const input = {
    householdId,
    text: typeof body?.text === 'string' ? body.text : '',
    mode: (body?.mode === 'overheard' || body?.mode === 'followup' ? body.mode : 'addressed') as TalkMode,
    clientKey,
  };

  if (!req.headers.get('accept')?.includes('application/x-ndjson')) {
    const result = await handleTalk(supabaseDeps(), input);
    return Response.json(result.body, { status: result.status });
  }

  // Streaming: one JSON line per piece of the reply ({ delta }), then the final result ({ done: true, ... }).
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + '\n'));
      try {
        const result = await handleTalk(supabaseDeps(), { ...input, onDelta: (delta) => send({ delta }) });
        send({ done: true, status: result.status, ...result.body });
      } catch (e) {
        console.error('talk stream failed', e);
        send({ done: true, status: 500, reply: null });
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store, no-transform' },
  });
}
