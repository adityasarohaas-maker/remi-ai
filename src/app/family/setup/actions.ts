'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { field } from '@/lib/form';

export async function createHousehold(form: FormData) {
  const sb = await supabaseServer();
  const patientName = field(form, 'patient_name', 80);
  const preferredName = field(form, 'preferred_name', 40) || patientName.split(' ')[0];
  const language = field(form, 'language', 10) || 'en-IN';
  const timezone = field(form, 'timezone', 60) || 'Asia/Kolkata';
  if (!patientName) return;
  const { error } = await sb.rpc('create_household', {
    p_patient_name: patientName, p_preferred_name: preferredName, p_language: language, p_timezone: timezone,
  });
  if (error && !error.message.includes('already in a household')) throw new Error(error.message);
  redirect('/family');
}
