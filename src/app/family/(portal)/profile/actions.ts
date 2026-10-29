'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily } from '@/lib/household';
import { field } from '@/lib/form';
import { isValidTimeZone } from '@/core/time';
import { isDemoHousehold } from '@/core/demo';
import { isSupportedLanguage } from '@/core/voices';

export async function addCareContact(form: FormData) {
  const { sb, householdId } = await requireFamily();
  const name = field(form, 'name', 80);
  const email = field(form, 'email', 120).toLowerCase();
  if (!name || !email.includes('@')) return;
  await sb.from('care_contacts').insert({ household_id: householdId, name, email }); // RLS: admins only
  revalidatePath('/family/profile');
}

export async function removeCareContact(form: FormData) {
  const { sb } = await requireFamily();
  await sb.from('care_contacts').delete().eq('id', field(form, 'id', 64));
  revalidatePath('/family/profile');
}

export async function saveProfile(form: FormData) {
  const { sb, householdId } = await requireFamily();
  const v = (k: string, max: number) => field(form, k, max) || null;
  const tz = field(form, 'timezone', 60);
  const language = field(form, 'language', 10);
  // The shared demo family keeps its language and clock so one visitor can't break it for the next.
  const locked = isDemoHousehold(householdId);
  const { error } = await sb.from('households').update({
    preferred_name: field(form, 'preferred_name', 40) || undefined,
    language: !locked && isSupportedLanguage(language) ? language : undefined,
    timezone: !locked && isValidTimeZone(tz) ? tz : undefined,
    about: v('about', 2000),
    home_address: v('home_address', 300),
    primary_contact_name: v('primary_contact_name', 60),
    primary_contact_phone: v('primary_contact_phone', 30),
    telegram_chat_id: v('telegram_chat_id', 40),
  }).eq('id', householdId);
  if (error) throw new Error(error.message);
  revalidatePath('/family', 'layout');
}
