import { supabaseAdmin } from '@/lib/supabase/server';
import { extractNewMemories } from '@/lib/memories';
import { mapLimit } from '@/core/map-limit';

export const maxDuration = 300;

/** Nightly: anything the tablet didn't hand over at the end of a conversation. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('forbidden', { status: 403 });
  }
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: active } = await db.from('events').select('household_id').eq('type', 'conversation').gte('created_at', since).limit(5000);
  const ids = [...new Set((active ?? []).map((e) => e.household_id as string))];
  const results = await mapLimit(ids, 2, async (id) => {
    try { return { id, ...(await extractNewMemories(id)) }; } catch (e) { return { id, error: (e as Error).message }; }
  });
  return Response.json({ results });
}
