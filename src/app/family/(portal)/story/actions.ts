'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily, requireAdmin, requireAdminWriter } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { signedClipUrl } from '@/lib/clips';
import { openDueLetters, makeLetterLink } from '@/lib/letters';
import { field } from '@/lib/form';
import { canMakeLetterLink } from '@/core/letters';

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
  const { householdId, user } = await requireAdmin();
  const id = field(form, 'id', 64);
  if (!id) return;
  // this opens what waits for the day: only the server may do it, and it writes down who asked
  const db = supabaseAdmin();
  const { data: marked } = await db.from('life_events').update({ happened_on: new Date().toISOString().slice(0, 10) }).eq('id', id).eq('household_id', householdId).select('id').maybeSingle();
  if (!marked) return;
  await db.from('events').insert({ household_id: householdId, type: 'event_marked', payload: { by: user.id, eventId: id } });
  await openDueLetters(householdId);
  revalidatePath('/family/story');
}

type LetterRow = { id: string; opened_at: string | null; visible_to: string[]; recipient_name: string | null };
async function letterFor(householdId: string, id: string): Promise<LetterRow | null> {
  if (!id) return null;
  const { data } = await supabaseAdmin().from('memories').select('id, opened_at, visible_to, recipient_name').eq('id', id).eq('household_id', householdId).maybeSingle();
  return (data as LetterRow | null) ?? null;
}

/** An address for a letter to someone outside the family. Only the address changes; the words stay sealed. */
export async function addRecipientEmail(form: FormData) {
  const { householdId } = await requireAdminWriter();
  const id = field(form, 'id', 64);
  const email = field(form, 'email', 120).toLowerCase();
  if (!email.includes('@')) return;
  const m = await letterFor(householdId, id);
  if (!m || !m.recipient_name || (m.visible_to ?? []).length) return;
  await supabaseAdmin().from('memories').update({ recipient_email: email }).eq('id', id);
  revalidatePath('/family/story');
}

/** A link to hand on by other means. Shown once to the admin who asked; never stored anywhere the family can read. */
export async function newLetterLink(memoryId: string): Promise<string | null> {
  const { householdId } = await requireAdmin();
  const m = await letterFor(householdId, typeof memoryId === 'string' ? memoryId.slice(0, 64) : '');
  if (!m || !canMakeLetterLink({ visibleTo: m.visible_to ?? [], recipientName: m.recipient_name, openedAt: m.opened_at })) return null;
  return makeLetterLink(m.id);
}
