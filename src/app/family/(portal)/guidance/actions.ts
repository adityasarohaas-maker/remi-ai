'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily } from '@/lib/household';
import { field } from '@/lib/form';

const APPROACHES = ['redirect', 'share_memory', 'call_relative'] as const;

export async function addGuidance(form: FormData) {
  const { sb, householdId } = await requireFamily();
  const topic = field(form, 'topic', 80);
  const triggerWords = field(form, 'trigger_words', 300).split(',').map((w) => w.trim()).filter(Boolean).slice(0, 15);
  const approach = field(form, 'approach', 20) as (typeof APPROACHES)[number];
  const familyScript = field(form, 'family_script', 1000);
  const callPersonId = field(form, 'call_person_id', 64) || null;
  if (!topic || !triggerWords.length || !APPROACHES.includes(approach) || !familyScript) return;
  if (callPersonId) {
    const { data } = await sb.from('people').select('id').eq('id', callPersonId).eq('household_id', householdId).maybeSingle();
    if (!data) return;
  }
  const { error } = await sb.from('sensitive_guidance').insert({
    household_id: householdId, topic, trigger_words: triggerWords, approach, family_script: familyScript,
    call_person_id: approach === 'call_relative' ? callPersonId : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/family/guidance');
}

export async function deleteGuidance(form: FormData) {
  const { sb, householdId } = await requireFamily();
  await sb.from('sensitive_guidance').delete().eq('id', field(form, 'id', 64)).eq('household_id', householdId);
  revalidatePath('/family/guidance');
}
