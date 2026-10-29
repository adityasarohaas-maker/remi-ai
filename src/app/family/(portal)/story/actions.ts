'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily, requireAdmin } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { signedClipUrl } from '@/lib/clips';
import { openDueLetters, makeLetterLink } from '@/lib/letters';
import { field } from '@/lib/form';

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

/** The family marks a day she was waiting for; anything sealed until then opens now. */
export async function markEventHappened(form: FormData) {
  const { sb, householdId } = await requireAdmin();
  const id = field(form, 'id', 64);
  if (!id) return;
  await sb.from('life_events').update({ happened_on: new Date().toISOString().slice(0, 10) }).eq('id', id).eq('household_id', householdId);
  await openDueLetters(householdId);
  revalidatePath('/family/story');
}

export async function addRecipientEmail(form: FormData) {
  const { householdId } = await requireAdmin();
  const id = field(form, 'id', 64);
  const email = field(form, 'email', 120).toLowerCase();
  if (!id || !email.includes('@')) return;
  // the memory is sealed, so the family can't read it; only the address changes, through the server
  await supabaseAdmin().from('memories').update({ recipient_email: email }).eq('id', id).eq('household_id', householdId);
  revalidatePath('/family/story');
}

export async function newLetterLink(form: FormData): Promise<void> {
  const { householdId } = await requireAdmin();
  const id = field(form, 'id', 64);
  const { data } = await supabaseAdmin().from('memories').select('id, opened_at').eq('id', id).eq('household_id', householdId).maybeSingle();
  if (!data?.opened_at) return;
  const link = await makeLetterLink(id);
  await supabaseAdmin().from('events').insert({ household_id: householdId, type: 'letter_link', payload: { memoryId: id, link } });
  revalidatePath('/family/story');
}
