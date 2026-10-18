import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { handleIdentify } from '@/core/identify';

export async function POST(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { embedding?: unknown } | null;
  const result = await handleIdentify(supabaseDeps(), { householdId, embedding: body?.embedding });
  return Response.json(result.body, { status: result.status });
}
