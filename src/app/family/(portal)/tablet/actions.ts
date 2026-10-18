'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily } from '@/lib/household';
import { field } from '@/lib/form';
import { newDeviceToken, hashDeviceToken } from '@/lib/device-token';
import { isDemoHousehold } from '@/core/demo';

export async function createDevice(_prev: { url?: string; error?: string } | null, form: FormData): Promise<{ url?: string; error?: string }> {
  const { sb, householdId } = await requireFamily();
  const token = newDeviceToken();
  const { error } = await sb.from('devices').insert({
    household_id: householdId, token_hash: hashDeviceToken(token), label: field(form, 'label', 40) || 'Tablet',
  });
  if (error) return { error: error.message };
  revalidatePath('/family/tablet');
  return { url: `/patient/${token}` };
}

export async function revokeDevice(form: FormData) {
  const { sb, householdId } = await requireFamily();
  if (isDemoHousehold(householdId)) return; // the public demo tablet must stay on for every judge
  await sb.from('devices').update({ revoked_at: new Date().toISOString() }).eq('id', field(form, 'id', 64)).eq('household_id', householdId);
  revalidatePath('/family/tablet');
}
