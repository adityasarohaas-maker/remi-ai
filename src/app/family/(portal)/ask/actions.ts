'use server';
import { requireFamily } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { askRemi } from '@/lib/ask';
import type { Answer } from '@/core/ask';

export type AskResult = (Answer & { clips: { memoryId: string; title: string; url: string | null }[] }) | { error: string };

export async function ask(question: string): Promise<AskResult> {
  const { sb, householdId } = await requireFamily();
  if (typeof question !== 'string' || !question.trim()) return { error: 'Ask something first.' };
  if (!(await supabaseDeps().takeRateToken(householdId, 'ask', 20, 60))) return { error: 'Give Remi a moment; too many questions at once.' };
  try {
    const r = await askRemi(sb, householdId, question);
    await supabaseDeps().logEvent(householdId, 'ask', { question: question.slice(0, 300), nothingFound: r.nothingFound, memoryIds: r.memoryIds });
    return r;
  } catch (e) {
    console.error('ask failed', (e as Error).message);
    return { error: "Remi couldn't answer just now. Please try again." };
  }
}
