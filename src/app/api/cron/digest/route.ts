import { supabaseAdmin } from '@/lib/supabase/server';
import { generateDigest } from '@/lib/digest';
import { sendTelegram } from '@/lib/alerts';
import { mapLimit } from '@/core/map-limit';

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('forbidden', { status: 403 });
  }
  const db = supabaseAdmin();
  // Only households with activity in the last day: empty sign-ups must not burn Nemotron Super calls.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: active } = await db.from('events').select('household_id').gte('created_at', since).limit(5000);
  const ids = [...new Set((active ?? []).map((e) => e.household_id as string))];
  if (!ids.length) return Response.json({ results: [] });
  const { data: households } = await db.from('households').select('id, preferred_name, telegram_chat_id').in('id', ids);

  const results = await mapLimit(households ?? [], 4, async (h) => {
    try {
      const { summary } = await generateDigest(h.id);
      if (h.telegram_chat_id) await sendTelegram(h.telegram_chat_id, `🌙 Evening note · ${h.preferred_name}\n\n${summary}`);
      return { id: h.id, ok: true };
    } catch (e) {
      console.error('digest failed', h.id, e);
      return { id: h.id, ok: false };
    }
  });
  return Response.json({ results });
}
