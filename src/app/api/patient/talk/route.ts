import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { handleTalk } from '@/core/talk';

export async function POST(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const result = await handleTalk(supabaseDeps(), { householdId, text: typeof body?.text === 'string' ? body.text : '' });
  return Response.json(result.body, { status: result.status });
}
