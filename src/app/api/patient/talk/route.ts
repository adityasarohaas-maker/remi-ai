import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { handleTalk } from '@/core/talk';

export async function POST(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: unknown; mode?: unknown } | null;
  const clientKey = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
  const result = await handleTalk(supabaseDeps(), {
    householdId,
    text: typeof body?.text === 'string' ? body.text : '',
    mode: body?.mode === 'overheard' || body?.mode === 'followup' ? body.mode : 'addressed',
    clientKey,
  });
  return Response.json(result.body, { status: result.status });
}
