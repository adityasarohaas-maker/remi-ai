'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { field } from '@/lib/form';
import { DEFAULT_TIME_ZONE, isValidTimeZone } from '@/core/time';
import { isSupportedLanguage } from '@/core/voices';

export async function createHousehold(form: FormData) {
  const sb = await supabaseServer();
  const patientName = field(form, 'patient_name', 80);
  const preferredName = field(form, 'preferred_name', 40) || patientName.split(' ')[0];
  const asked = field(form, 'language', 10);
  const language = isSupportedLanguage(asked) ? asked : 'en-US';
  const tzInput = field(form, 'timezone', 60);
  const timezone = isValidTimeZone(tzInput) ? tzInput : DEFAULT_TIME_ZONE;
  if (!patientName) return;
  const careRaw = field(form, 'care_type', 10);
  const careType = careRaw === 'dementia' || careRaw === 'terminal' ? careRaw : 'elderly';
  const { data: id, error } = await sb.rpc('create_household', {
    p_patient_name: patientName, p_preferred_name: preferredName, p_language: language, p_timezone: timezone,
  });
  if (error && !error.message.includes('already in a household')) throw new Error(error.message);
  if (id) await sb.from('households').update({ care_type: careType }).eq('id', id as string);
  // her say over her voice comes next, before the first conversation
  redirect('/family/consent');
}
