'use server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { requireWriter, requireAdminWriter } from '@/lib/household';
import { field } from '@/lib/form';

const PHOTO_MAX_BYTES = 8_000_000;

export async function addPhoto(form: FormData): Promise<void> {
  const { sb, householdId, user } = await requireWriter();
  const file = form.get('photo');
  if (!(file instanceof File) || !file.size || !file.type.startsWith('image/') || file.size > PHOTO_MAX_BYTES) return;
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${householdId}/photos/${randomUUID()}.${ext}`;
  const { error: upErr } = await sb.storage.from('family-media').upload(path, file, { contentType: file.type });
  if (upErr) throw new Error(upErr.message);
  const yearText = field(form, 'year', 4);
  const year = /^\d{4}$/.test(yearText) ? Number(yearText) : null;
  const { error } = await sb.from('photos').insert({
    household_id: householdId, storage_path: path, note: field(form, 'note', 200) || null, year, uploaded_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/family/photos');
}

export async function deletePhoto(form: FormData) {
  const { sb, householdId } = await requireAdminWriter();
  const id = field(form, 'id', 64);
  const { data } = await sb.from('photos').select('storage_path').eq('id', id).eq('household_id', householdId).maybeSingle();
  if (!data) return;
  const { error } = await sb.from('photos').delete().eq('id', id); // the file goes only after the row did
  if (error) throw new Error(error.message);
  await sb.storage.from('family-media').remove([data.storage_path as string]);
  revalidatePath('/family/photos');
}
