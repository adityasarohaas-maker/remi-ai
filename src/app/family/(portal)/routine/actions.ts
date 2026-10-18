'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily } from '@/lib/household';
import { field } from '@/lib/form';

const KINDS = ['medicine', 'meal', 'activity'] as const;

export async function addRoutine(form: FormData) {
  const { sb, householdId } = await requireFamily();
  const time = field(form, 'time_of_day', 5);
  const kind = field(form, 'kind', 10) as (typeof KINDS)[number];
  const label = field(form, 'label', 80);
  if (!/^\d{2}:\d{2}$/.test(time) || !KINDS.includes(kind) || !label) return;
  const { error } = await sb.from('routine_items').insert({
    household_id: householdId, time_of_day: time, kind, label, spoken_message: field(form, 'spoken_message', 300) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/family/routine');
}

export async function deleteRoutine(form: FormData) {
  const { sb, householdId } = await requireFamily();
  await sb.from('routine_items').delete().eq('id', field(form, 'id', 64)).eq('household_id', householdId);
  revalidatePath('/family/routine');
}
