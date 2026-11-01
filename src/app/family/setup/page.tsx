import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LocaleFields } from '../components/locale-fields';
import { supabaseServer } from '@/lib/supabase/server';
import { createHousehold } from './actions';
import { PRODUCT_NAME } from '@/core/brand';
import { NightStage } from '@/app/_site/night-stage';
import { BrandMark } from '@/app/_site/brand-mark';

/** The first question a new family answers, on the same stage as sign-in. */
export default async function SetupPage() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await sb.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle();
  if (data) redirect('/family');
  return (
    <main className="forest f-app">
      <NightStage />
      <section className="f-card-page f-glass">
        <Link href="/" className="f-brand"><BrandMark />{PRODUCT_NAME}</Link>
        <h1>Who are we caring for?</h1>
        <p className="f-sub">A few things so {PRODUCT_NAME} can greet them by the right name and know what brought you here.</p>
        <form action={createHousehold} className="mt-7 space-y-4">
          <label className="block">Full name<input name="patient_name" required className="mt-1 w-full rounded-lg border px-4 py-3" /></label>
          <label className="block">What they like to be called<input name="preferred_name" placeholder="e.g. Avni, Nani" className="mt-1 w-full rounded-lg border px-4 py-3" /></label>
          <LocaleFields />
          <fieldset className="rounded-xl border p-4">
            <legend className="px-1">What brings you to {PRODUCT_NAME}?</legend>
            <label className="flex items-center gap-2"><input type="radio" name="care_type" value="elderly" defaultChecked /> They&apos;re getting older, and we want to keep their stories</label>
            <label className="mt-1 flex items-center gap-2"><input type="radio" name="care_type" value="dementia" /> They&apos;re living with dementia</label>
            <label className="mt-1 flex items-center gap-2"><input type="radio" name="care_type" value="terminal" /> A serious illness; time may be short</label>
          </fieldset>
          <button className="rounded-lg bg-garden px-5 py-3 text-night">Continue</button>
        </form>
      </section>
    </main>
  );
}
