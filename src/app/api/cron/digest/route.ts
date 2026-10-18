import { supabaseAdmin } from '@/lib/supabase/server';
import { generateDigest } from '@/lib/digest';
import { sendTelegram } from '@/lib/alerts';

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('forbidden', { status: 403 });
  }
  const { data: households } = await supabaseAdmin().from('households').select('id, preferred_name, telegram_chat_id');
  const results: { id: string; ok: boolean }[] = [];
  for (const h of households ?? []) {
    try {
      const { summary } = await generateDigest(h.id);
      if (h.telegram_chat_id) await sendTelegram(h.telegram_chat_id, `🌙 Evening note · ${h.preferred_name}\n\n${summary}`);
      results.push({ id: h.id, ok: true });
    } catch (e) {
      console.error('digest failed', h.id, e);
      results.push({ id: h.id, ok: false });
    }
  }
  return Response.json({ results });
}
