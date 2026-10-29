import { supabaseAdmin } from '@/lib/supabase/server';
import { openDueLetters } from '@/lib/letters';
import { mapLimit } from '@/core/map-limit';

export const maxDuration = 300;

/** Daily: sealed memories whose day has come open, and the people they are for hear about it. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('forbidden', { status: 403 });
  }
  const db = supabaseAdmin();
  const { data: sealed } = await db.from('memories').select('household_id').is('opened_at', null).in('visibility', ['after_death', 'on_date', 'on_event']).limit(5000);
  const ids = [...new Set((sealed ?? []).map((m) => m.household_id as string))];
  const results = await mapLimit(ids, 4, async (id) => {
    try { return { id, ...(await openDueLetters(id)) }; } catch (e) { return { id, error: (e as Error).message }; }
  });
  return Response.json({ results });
}
