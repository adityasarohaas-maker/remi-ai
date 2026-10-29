'use server';
import { revalidatePath } from 'next/cache';
import { requireFamily } from '@/lib/household';
import { field } from '@/lib/form';
import { isValidTimeZone } from '@/core/time';
import { isDemoHousehold } from '@/core/demo';
import { isSupportedLanguage } from '@/core/voices';
import { requireAdmin } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { canUndoPassed } from '@/core/passed';
import { openDueLetters } from '@/lib/letters';

export async function markPassed(form: FormData) {
  const { sb, householdId } = await requireAdmin();
  const { data: h } = await sb.from('households').select('preferred_name, patient_name, status').eq('id', householdId).single();
  if (!h || h.status === 'passed') return;
  const typed = field(form, 'confirm', 120).toLowerCase();
  if (typed !== String(h.preferred_name).toLowerCase() && typed !== String(h.patient_name).toLowerCase()) return;
  const passedOn = field(form, 'passed_on', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(passedOn)) return;
  const { error } = await sb.from('households').update({ status: 'passed', passed_on: passedOn, passed_marked_at: new Date().toISOString() }).eq('id', householdId);
  if (error) throw new Error(error.message);
  await openDueLetters(householdId);
  revalidatePath('/family', 'layout');
}

export async function undoPassed() {
  const { householdId } = await requireAdmin();
  const db = supabaseAdmin();
  const { data: h } = await db.from('households').select('status, passed_marked_at, is_demo').eq('id', householdId).single();
  if (!h) return;
  const { count } = await db.from('memories').select('id', { count: 'exact', head: true }).eq('household_id', householdId)
    .not('opened_at', 'is', null).gte('opened_at', h.passed_marked_at ?? '1970-01-01');
  if (!canUndoPassed(h as { status: 'living' | 'passed'; passed_marked_at: string | null; is_demo: boolean }, (count ?? 0) > 0, new Date())) return;
  await db.from('households').update({ status: 'living', passed_on: null, passed_marked_at: null }).eq('id', householdId);
  if (h.is_demo) await db.from('memories').update({ opened_at: null }).eq('household_id', householdId).eq('visibility', 'after_death');
  revalidatePath('/family', 'layout');
}

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
