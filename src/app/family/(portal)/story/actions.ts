'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily } from '@/lib/household';
import { signedClipUrl } from '@/lib/clips';

/** A link to hear her tell it; null when there is no clip or it isn't theirs to hear. */
export async function playClip(memoryId: string): Promise<string | null> {
  const { sb } = await requireFamily();
  if (typeof memoryId !== 'string' || memoryId.length > 64) return null;
  return signedClipUrl(sb, memoryId);
}

export async function markMemory(memoryId: string, confidence: 'sure' | 'unsure'): Promise<void> {
  const { sb } = await requireFamily();
  if (confidence !== 'sure' && confidence !== 'unsure') return;
  const { error } = await sb.rpc('verify_memory', { p_memory: memoryId, p_confidence: confidence });
  if (error) console.error('verify_memory failed', error.message);
  revalidatePath('/family/story');
}
