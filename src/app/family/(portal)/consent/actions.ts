'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/household';
import { field } from '@/lib/form';

export async function saveConsent(form: FormData) {
  const { sb, householdId, displayName, user } = await requireAdmin();
  const decidedBy = field(form, 'decided_by', 10) === 'person' ? 'person' : 'family';
  const { data: h } = await sb.from('households').select('preferred_name').eq('id', householdId).single();
  const { error } = await sb.from('consents').upsert({
    household_id: householdId,
    record_voice: form.get('record_voice') === 'on',
    default_visibility: field(form, 'default_visibility', 20) === 'after_death' ? 'after_death' : 'everyone',
    allow_persona: form.get('allow_persona') === 'on',
    allow_voice_clone: form.get('allow_voice_clone') === 'on',
    decided_by: decidedBy,
    decided_by_name: decidedBy === 'person' ? h?.preferred_name ?? null : displayName ?? user.email ?? null,
    decided_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/family/consent');
  revalidatePath('/family');
}
