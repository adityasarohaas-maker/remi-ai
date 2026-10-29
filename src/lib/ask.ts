import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { chatJson, MODELS } from '@/lib/claude';
import { signedClipUrl } from '@/lib/clips';
import { answerQuestion, AnswerSchema, type AskMemory, type Answer, type Pronoun } from '@/core/ask';

const COLS = 'id, title, quote, summary, year_from, confidence';
type Row = { id: string; title: string; quote: string; summary: string; year_from: number | null; confidence: 'sure' | 'unsure' };
const toAsk = (r: Row): AskMemory => ({ id: r.id, title: r.title, quote: r.quote, summary: r.summary, year: r.year_from, confidence: r.confidence });

/**
 * Answers a family question from her memories. Every read goes through the viewer's own client,
 * so sealed memories never reach the model, and clips are signed only for what was cited.
 */
export async function askRemi(sb: SupabaseClient, householdId: string, question: string): Promise<Answer & { clips: { memoryId: string; title: string; url: string | null }[] }> {
  const { data: h } = await sb.from('households').select('preferred_name').eq('id', householdId).single();
  const pronoun: Pronoun = 'she';
  const answer = await answerQuestion({
    async search(q, limit) {
      const { data } = await sb.from('memories').select(COLS).eq('household_id', householdId)
        .textSearch('search', q, { type: 'websearch', config: 'simple' }).limit(limit);
      return ((data ?? []) as Row[]).map(toAsk);
    },
    async newest(limit) {
      const { data } = await sb.from('memories').select(COLS).eq('household_id', householdId).order('created_at', { ascending: false }).limit(limit);
      return ((data ?? []) as Row[]).map(toAsk);
    },
    ask: (messages) => chatJson(messages, AnswerSchema, { model: MODELS.deep(), effort: 'high', maxTokens: 1500, timeoutMs: 60_000 }),
  }, { preferredName: (h?.preferred_name as string) ?? '', pronoun, question });

  const { data: cited } = answer.memoryIds.length
    ? await sb.from('memories').select('id, title').in('id', answer.memoryIds)
    : { data: [] as { id: string; title: string }[] };
  const clips = await Promise.all((cited ?? []).map(async (m) => ({ memoryId: m.id as string, title: m.title as string, url: await signedClipUrl(sb, m.id as string) })));
  return { ...answer, clips };
}
