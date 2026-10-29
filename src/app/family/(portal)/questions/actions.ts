'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily } from '@/lib/household';
import { field } from '@/lib/form';

export const QUESTION_MAX = 300;

export async function askQuestion(form: FormData) {
  const { sb, householdId, user } = await requireFamily();
  const question = field(form, 'question', QUESTION_MAX);
  if (!question) return;
  const { error } = await sb.from('family_questions').insert({ household_id: householdId, asked_by: user.id, question });
  if (error) throw new Error(error.message);
  revalidatePath('/family/questions');
}

export async function deleteQuestion(form: FormData) {
  const { sb } = await requireFamily();
  const id = field(form, 'id', 64);
  if (id) await sb.from('family_questions').delete().eq('id', id); // RLS: only the asker, only while pending
  revalidatePath('/family/questions');
}
