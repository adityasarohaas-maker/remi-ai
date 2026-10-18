import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { localParts } from '@/core/time';
import { reminderStates } from '@/core/reminders';

export async function GET(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const deps = supabaseDeps();
  const now = deps.now();
  const ctx = await deps.loadContext(householdId, now);
  const local = localParts(now, ctx.household.timezone);
  return Response.json({
    now: { weekday: local.weekday, prettyDate: local.prettyDate, prettyTime: local.prettyTime, partOfDay: local.partOfDay },
    items: reminderStates(ctx.routine, ctx.doneIds, local.minutes),
  });
}
