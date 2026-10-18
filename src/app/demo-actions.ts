'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

export async function startDemo() {
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email: process.env.DEMO_EMAIL!, password: process.env.DEMO_PASSWORD! });
  if (error) throw new Error('The demo is resetting. Try again in a minute.');
  redirect('/family');
}
