import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { chatText, MODELS } from '@/lib/nebius';
import { supabaseDeps } from '@/lib/deps';
import { localParts, dayRangeUtc } from '@/core/time';
import { reminderStates } from '@/core/reminders';
import { summarizeDay, type DayEvent } from '@/core/day-summary';
import { buildDigestMessages } from '@/core/digest-prompt';

export async function generateDigest(householdId: string, dayArg?: string) {
  const db = supabaseAdmin();
  const now = new Date();
  const ctx = await supabaseDeps().loadContext(householdId, now);
  const tz = ctx.household.timezone;
  const local = localParts(now, tz);
  const day = dayArg ?? local.day;
  const { start, end } = dayRangeUtc(day, tz);
  const { data: events } = await db.from('events').select('type, payload, created_at')
    .eq('household_id', householdId).gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
    .order('created_at').limit(2000);
  const minutes = day === local.day ? local.minutes : 24 * 60;
  const facts = summarizeDay(day, (events ?? []) as DayEvent[], reminderStates(ctx.routine, ctx.doneIds, minutes), tz);
  const summary = await chatText(buildDigestMessages(ctx.household.preferredName, facts), {
    model: MODELS.report(), maxTokens: 700, temperature: 0.3, timeoutMs: 60_000,
  });
  if (!summary) throw new Error('empty digest');
  await db.from('digests').upsert(
    { household_id: householdId, day, facts, summary, model: MODELS.report() },
    { onConflict: 'household_id,day' },
  );
  return { day, summary, facts };
}
