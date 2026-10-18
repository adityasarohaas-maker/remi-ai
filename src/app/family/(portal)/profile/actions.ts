'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily } from '@/lib/household';
import { field } from '@/lib/form';

export async function saveProfile(form: FormData) {
  const { sb, householdId } = await requireFamily();
  const v = (k: string, max: number) => field(form, k, max) || null;
  const { error } = await sb.from('households').update({
    preferred_name: field(form, 'preferred_name', 40) || undefined,
    language: field(form, 'language', 10) || 'en-IN',
    timezone: field(form, 'timezone', 60) || 'Asia/Kolkata',
    about: v('about', 2000),
    home_address: v('home_address', 300),
    primary_contact_name: v('primary_contact_name', 60),
    primary_contact_phone: v('primary_contact_phone', 30),
    telegram_chat_id: v('telegram_chat_id', 40),
  }).eq('id', householdId);
  if (error) throw new Error(error.message);
  revalidatePath('/family', 'layout');
}
