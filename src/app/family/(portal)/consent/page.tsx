import { requireFamily } from '@/lib/household';
import { canAdmin } from '@/core/roles';
import { signedRecordingUrl } from '@/lib/clips';
import { saveConsent } from './actions';

export default async function ConsentPage() {
  const { sb, householdId, role } = await requireFamily();
  const [{ data: h }, { data: c }] = await Promise.all([
    sb.from('households').select('preferred_name, care_type').eq('id', householdId).single(),
    sb.from('consents').select('*').eq('household_id', householdId).maybeSingle(),
  ]);
  const name = h?.preferred_name ?? '';
  const admin = canAdmin(role);
  const clip = c?.recording_id ? await signedRecordingUrl(c.recording_id as string) : null;
  const dis = admin ? {} : { disabled: true };

  return (
    <section className="max-w-xl">
      <h1 className="f-h1">{name}&apos;s say</h1>
      <p className="mt-1 text-dim">What Remi may keep, who may hear it, and what happens after she&apos;s gone. {h?.care_type === 'dementia' && 'Decide this early, while she can take part.'}</p>
      {!c?.decided_at && <p className="mt-4 rounded-xl bg-garden/10 p-3 text-sm">Not decided yet. Remi will ask {name} the first time the tablet starts; you can also decide here.</p>}
      {c?.decided_at && (
        <p className="mt-4 rounded-xl bg-leaf p-3 text-sm">
          {c.decided_by === 'person' ? `${name} said so herself, on the tablet` : `Decided by ${c.decided_by_name ?? 'the family'}`} on {new Date(c.decided_at).toLocaleDateString()}.
          {clip && <> <audio controls src={clip} className="mt-2 w-full" /></>}
        </p>
      )}
      <form action={saveConsent} className="mt-6 space-y-5">
        <label className="flex items-start gap-3"><input type="checkbox" name="record_voice" defaultChecked={c?.record_voice ?? true} {...dis} className="mt-1" />
          <span><b>Keep {name}&apos;s voice.</b><br /><span className="text-sm text-dim">Her side of each conversation is recorded, so her stories stay in her own voice.</span></span></label>
        <label className="block"><b>Who hears new stories, unless she says otherwise</b>
          <select name="default_visibility" defaultValue={c?.default_visibility ?? 'everyone'} {...dis} className="mt-1 w-full rounded-lg border px-3 py-2">
            <option value="everyone">The whole family, as they are told</option>
            <option value="after_death">Only after she&apos;s gone</option>
          </select></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="allow_persona" defaultChecked={c?.allow_persona ?? false} {...dis} className="mt-1" />
          <span><b>Allow &ldquo;Talk with {name}&rdquo; after she&apos;s gone.</b><br /><span className="text-sm text-dim">An AI that speaks as her, from her stories. Always marked as AI. The family can turn it on later only if this is allowed.</span></span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="allow_voice_clone" defaultChecked={c?.allow_voice_clone ?? false} {...dis} className="mt-1" />
          <span><b>Allow her voice to be recreated, later.</b><br /><span className="text-sm text-dim">Not built yet; asked now so it never has to be asked again.</span></span></label>
        <fieldset className="rounded-xl border p-4 text-sm">
          <legend className="px-1 font-medium">Who decided</legend>
          <label className="flex items-center gap-2"><input type="radio" name="decided_by" value="person" defaultChecked={c?.decided_by !== 'family'} {...dis} /> {name} said so</label>
          <label className="mt-1 flex items-center gap-2"><input type="radio" name="decided_by" value="family" defaultChecked={c?.decided_by === 'family'} {...dis} /> We decided for {name} (she can no longer decide herself)</label>
        </fieldset>
        {admin ? <button className="rounded-lg bg-garden px-5 py-3 text-night">Save</button> : <p className="text-sm text-dim">Only an owner or admin can change this.</p>}
      </form>
    </section>
  );
}
