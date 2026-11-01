import { requireFamily } from '@/lib/household';
import { saveProfile } from './actions';
import { LocaleFields } from '../../components/locale-fields';
import { isDemoHousehold } from '@/core/demo';
import { canAdmin } from '@/core/roles';
import { CareContacts } from './care-contacts';
import { PassedForm } from './passed';
import { canUndoPassed } from '@/core/passed';

const input = 'mt-1 w-full rounded-lg border px-4 py-3';

export default async function ProfilePage() {
  const { sb, householdId, role } = await requireFamily();
  const [{ data: h }, { data: contacts }] = await Promise.all([
    sb.from('households').select('*').eq('id', householdId).single(),
    sb.from('care_contacts').select('id, name, email').eq('household_id', householdId).order('name'),
  ]);
  if (!h) return null;
  const { count: openedSince } = h.status === 'passed'
    ? await sb.from('memories').select('id', { count: 'exact', head: true }).eq('household_id', householdId).not('opened_at', 'is', null).gte('opened_at', h.passed_marked_at ?? '1970-01-01')
    : { count: 0 };
  const canUndo = canUndoPassed({ status: h.status, passed_marked_at: h.passed_marked_at, is_demo: h.is_demo }, (openedSince ?? 0) > 0, new Date());
  return (
    <>
    <section className="max-w-xl">
      <h1 className="f-h1">Profile</h1>
      <p className="mt-1 text-dim">{h.patient_name}</p>
      <form action={saveProfile} className="mt-6 space-y-4">
        <label className="block">What they like to be called<input name="preferred_name" defaultValue={h.preferred_name} className={input} /></label>
        <LocaleFields language={h.language} timezone={h.timezone} locked={isDemoHousehold(householdId)} />
        <label className="block">About them — life story, favourite things, what calms them
          <textarea name="about" rows={5} defaultValue={h.about ?? ''} className={input} />
        </label>
        <label className="block">Home address<input name="home_address" defaultValue={h.home_address ?? ''} className={input} /></label>
        <label className="block">Main family contact (name)<input name="primary_contact_name" defaultValue={h.primary_contact_name ?? ''} className={input} /></label>
        <label className="block">Main family contact (phone)<input name="primary_contact_phone" type="tel" defaultValue={h.primary_contact_phone ?? ''} className={input} /></label>
        <label className="block">Telegram chat id for alerts
          <input name="telegram_chat_id" defaultValue={h.telegram_chat_id ?? ''} className={input} />
          <span className="mt-1 block text-sm text-dim">Message your family&apos;s Remi bot once, then ask @userinfobot for your chat id.</span>
        </label>
        <button className="rounded-lg bg-garden px-5 py-3 text-night">Save</button>
      </form>
    </section>
    <CareContacts contacts={(contacts ?? []) as { id: string; name: string; email: string }[]} admin={canAdmin(role)} />
    <PassedForm name={h.preferred_name} status={h.status} passedOn={h.passed_on} canUndo={canUndo} admin={canAdmin(role)} />
    </>
  );
}
