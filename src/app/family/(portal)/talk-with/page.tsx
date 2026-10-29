import Link from 'next/link';
import { requireFamily } from '@/lib/household';
import { PersonaChat } from './chat';

export default async function TalkWithPage() {
  const { sb, householdId } = await requireFamily();
  const [{ data: h }, { data: c }] = await Promise.all([
    sb.from('households').select('preferred_name, status').eq('id', householdId).single(),
    sb.from('consents').select('allow_persona').eq('household_id', householdId).maybeSingle(),
  ]);
  const name = h?.preferred_name ?? '';
  const allowed = h?.status === 'passed' && !!c?.allow_persona;
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Talk with {name} <span className="ml-2 align-middle rounded-full border border-stone-400 px-2 py-0.5 text-xs uppercase tracking-wide text-stone-500">AI</span></h1>
      {!allowed ? (
        <p className="mt-3 text-stone-600">
          {h?.status !== 'passed'
            ? `This becomes available after ${name} has passed, if she allowed it.`
            : `${name} did not allow this, or the family hasn't turned it on.`} See <Link href="/family/consent" className="underline">her say</Link>.
        </p>
      ) : (
        <div className="mt-4"><PersonaChat name={name} /></div>
      )}
    </div>
  );
}
