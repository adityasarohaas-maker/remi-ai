'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily } from '@/lib/household';
import { field } from '@/lib/form';
import { isValidEmbedding } from '@/core/face-match';

export async function addPerson(form: FormData) {
  const { sb, householdId } = await requireFamily();
  const name = field(form, 'name', 80);
  const relation = field(form, 'relation', 60);
  if (!name || !relation) return;
  const { error } = await sb.from('people').insert({
    household_id: householdId, name, relation,
    notes: field(form, 'notes', 1000) || null, is_deceased: form.get('is_deceased') === 'on',
  });
  if (error) throw new Error(error.message);
  revalidatePath('/family/people');
}

export async function deletePerson(form: FormData) {
  const { sb, householdId } = await requireFamily();
  await sb.from('people').delete().eq('id', field(form, 'id', 64)).eq('household_id', householdId);
  revalidatePath('/family/people');
}

export async function saveFaceEmbedding(personId: string, embedding: number[], photoPath: string) {
  const { sb, householdId } = await requireFamily();
  if (!isValidEmbedding(embedding)) throw new Error('That photo did not give usable face data.');
  if (!photoPath.startsWith(`${householdId}/`)) throw new Error('Bad photo path');
  const { data: person } = await sb.from('people').select('id').eq('id', personId).eq('household_id', householdId).maybeSingle();
  if (!person) throw new Error('Person not found');
  const { error } = await sb.from('face_embeddings').insert({ household_id: householdId, person_id: personId, embedding, photo_path: photoPath });
  if (error) throw new Error(error.message);
  revalidatePath('/family/people');
}
