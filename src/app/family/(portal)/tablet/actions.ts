'use server';
import { revalidatePath } from 'next/cache';
import { requireAdminWriter } from '@/lib/household';
import { field } from '@/lib/form';
import { newDeviceToken, hashDeviceToken } from '@/lib/device-token';

export async function createDevice(_prev: { url?: string; error?: string } | null, form: FormData): Promise<{ url?: string; error?: string }> {
  const { sb, householdId, user } = await requireAdminWriter();
  const token = newDeviceToken();
  const { error } = await sb.from('devices').insert({
    household_id: householdId, token_hash: hashDeviceToken(token), label: field(form, 'label', 40) || 'Tablet', created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/family/tablet');
  return { url: `/patient/${token}` };
}

export async function revokeDevice(form: FormData) {
  const { sb, householdId } = await requireAdminWriter(); // the public demo tablet stays on
  await sb.from('devices').update({ revoked_at: new Date().toISOString() }).eq('id', field(form, 'id', 64)).eq('household_id', householdId);
  revalidatePath('/family/tablet');
}
