import { requireFamily } from '@/lib/household';
import { saveProfile } from './actions';

const input = 'mt-1 w-full rounded-lg border px-4 py-3';

export default async function ProfilePage() {
  const { sb, householdId } = await requireFamily();
  const { data: h } = await sb.from('households').select('*').eq('id', householdId).single();
  if (!h) return null;
  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 text-stone-600">{h.patient_name}</p>
      <form action={saveProfile} className="mt-6 space-y-4">
        <label className="block">What they like to be called<input name="preferred_name" defaultValue={h.preferred_name} className={input} /></label>
        <label className="block">Language
          <select name="language" defaultValue={h.language} className={input}>
            <option value="en-IN">English</option>
            <option value="hi-IN">Hindi</option>
          </select>
        </label>
        <label className="block">Time zone<input name="timezone" defaultValue={h.timezone} className={input} /></label>
        <label className="block">About them — life story, favourite things, what calms them
          <textarea name="about" rows={5} defaultValue={h.about ?? ''} className={input} />
        </label>
        <label className="block">Home address<input name="home_address" defaultValue={h.home_address ?? ''} className={input} /></label>
        <label className="block">Main family contact (name)<input name="primary_contact_name" defaultValue={h.primary_contact_name ?? ''} className={input} /></label>
        <label className="block">Main family contact (phone)<input name="primary_contact_phone" type="tel" defaultValue={h.primary_contact_phone ?? ''} className={input} /></label>
        <label className="block">Telegram chat id for alerts
          <input name="telegram_chat_id" defaultValue={h.telegram_chat_id ?? ''} className={input} />
          <span className="mt-1 block text-sm text-stone-500">Message your family&apos;s Remi bot once, then ask @userinfobot for your chat id.</span>
        </label>
        <button className="rounded-lg bg-garden px-5 py-3 text-white">Save</button>
      </form>
    </section>
  );
}
