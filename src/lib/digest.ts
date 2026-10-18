import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { chatText, MODELS } from '@/lib/nebius';
import { supabaseDeps } from '@/lib/deps';
import { localParts, dayRangeUtc } from '@/core/time';
import { reminderStates } from '@/core/reminders';
import { summarizeDay, type DayEvent } from '@/core/day-summary';
import { buildDigestMessages } from '@/core/digest-prompt';
import { factsNote } from '@/core/digest-fallback';

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
  // No key, a Nebius outage or an empty reply still gives the family a note, written from the facts alone.
  let model = MODELS.report();
  let summary = await chatText(buildDigestMessages(ctx.household.preferredName, facts), {
    model, maxTokens: 700, temperature: 0.3, timeoutMs: 60_000,
  }).catch((e) => { console.error('digest model failed', e); return ''; });
  if (!summary) { summary = factsNote(ctx.household.preferredName, facts); model = 'facts-only'; }
  await db.from('digests').upsert(
    { household_id: householdId, day, facts, summary, model },
    { onConflict: 'household_id,day' },
  );
  return { day, summary, facts };
}
