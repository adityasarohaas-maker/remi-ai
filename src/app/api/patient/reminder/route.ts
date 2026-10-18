import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { localParts } from '@/core/time';

export async function POST(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { routineItemId?: unknown } | null;
  const deps = supabaseDeps();
  const now = deps.now();
  const ctx = await deps.loadContext(householdId, now);
  const item = ctx.routine.find((r) => r.id === body?.routineItemId);
  if (!item) return Response.json({ error: 'not found' }, { status: 404 });
  if (!ctx.doneIds.includes(item.id)) {
    await deps.logEvent(householdId, 'reminder_done', {
      routineItemId: item.id, label: item.label, kind: item.kind, day: localParts(now, ctx.household.timezone).day,
    });
  }
  return Response.json({ ok: true });
}
