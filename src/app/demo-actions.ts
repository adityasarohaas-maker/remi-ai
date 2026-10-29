'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { DEMO_HOUSEHOLD_ID, isDemoHousehold } from '@/core/demo';
import { openDueLetters } from '@/lib/letters';

export async function startDemo() {
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email: process.env.DEMO_EMAIL!, password: process.env.DEMO_PASSWORD! });
  if (error) throw new Error('The demo is resetting. Try again in a minute.');
  redirect('/family');
}

async function demoMemberHousehold(): Promise<string | null> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle();
  const id = data?.household_id as string | undefined;
  return id && isDemoHousehold(id) ? id : null;
}

/** The demo only: see the portal as the family would after Avni has passed. */
export async function seeAfter() {
  const id = await demoMemberHousehold();
  if (!id) return;
  await supabaseAdmin().from('households').update({ status: 'passed', passed_on: new Date().toISOString().slice(0, 10), passed_marked_at: new Date().toISOString() }).eq('id', DEMO_HOUSEHOLD_ID);
  await openDueLetters(DEMO_HOUSEHOLD_ID);
  revalidatePath('/family', 'layout');
  redirect('/family/remember');
}

/** The demo only: back to Avni living, with her sealed memories sealed again. */
export async function seeBefore() {
  const id = await demoMemberHousehold();
  if (!id) return;
  const db = supabaseAdmin();
  await db.from('households').update({ status: 'living', passed_on: null, passed_marked_at: null }).eq('id', DEMO_HOUSEHOLD_ID);
  await db.from('memories').update({ opened_at: null }).eq('household_id', DEMO_HOUSEHOLD_ID).in('visibility', ['after_death', 'on_event']);
  revalidatePath('/family', 'layout');
  redirect('/family');
}
