import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { localParts } from '@/core/time';
import { reminderStates } from '@/core/reminders';
import { isNightTheme } from '@/core/kodi';
import { isSupportedLanguage } from '@/core/voices';

export async function GET(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const deps = supabaseDeps();
  const now = deps.now();
  const ctx = await deps.loadContext(householdId, now);
  // ?lang= is the language picked on the tablet: the day and date read in it
  const asked = new URL(req.url).searchParams.get('lang') ?? '';
  const local = localParts(now, ctx.household.timezone, isSupportedLanguage(asked) ? asked : ctx.household.language);
  return Response.json({
    now: { weekday: local.weekday, prettyDate: local.prettyDate, prettyTime: local.prettyTime, partOfDay: local.partOfDay, night: isNightTheme(local.minutes) },
    items: reminderStates(ctx.routine, ctx.doneIds, local.minutes),
  });
}
