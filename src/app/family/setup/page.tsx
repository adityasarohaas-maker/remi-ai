import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { createHousehold } from './actions';

export default async function SetupPage() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await sb.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle();
  if (data) redirect('/family');
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-3xl font-semibold">Who are we caring for?</h1>
      <form action={createHousehold} className="mt-8 space-y-4">
        <label className="block">Full name<input name="patient_name" required className="mt-1 w-full rounded-lg border px-4 py-3" /></label>
        <label className="block">What they like to be called<input name="preferred_name" placeholder="e.g. Kamla, Nani" className="mt-1 w-full rounded-lg border px-4 py-3" /></label>
        <label className="block">Language
          <select name="language" className="mt-1 w-full rounded-lg border px-4 py-3">
            <option value="en-IN">English</option>
            <option value="hi-IN">Hindi</option>
          </select>
        </label>
        <label className="block">Time zone<input name="timezone" defaultValue="Asia/Kolkata" className="mt-1 w-full rounded-lg border px-4 py-3" /></label>
        <button className="rounded-lg bg-garden px-5 py-3 text-white">Continue</button>
      </form>
    </main>
  );
}
