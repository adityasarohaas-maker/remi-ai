import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireFamily } from '@/lib/household';
import { memoryFromRow, MEMORY_COLUMNS, type MemoryDbRow } from '@/core/memory-row';
import { MemoryCard } from '../story/memory-card';

/** The front page after she has passed: a story to hear today, and the ways in. */
export default async function RememberPage() {
  const { sb, householdId } = await requireFamily();
  const [{ data: h }, { data: rows }, { data: consent }] = await Promise.all([
    sb.from('households').select('preferred_name, patient_name, passed_on, status').eq('id', householdId).single(),
    sb.from('memories').select(MEMORY_COLUMNS).eq('household_id', householdId).eq('confidence', 'sure').not('recording_id', 'is', null),
    sb.from('consents').select('allow_persona').eq('household_id', householdId).maybeSingle(),
  ]);
  if (h?.status !== 'passed') redirect('/family');
  const name = h.preferred_name as string;
  const memories = ((rows ?? []) as MemoryDbRow[]).map(memoryFromRow);
  // one story a day, the same for everyone in the family that day
  const day = Math.floor(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) / 86_400_000);
  const today = memories.length ? memories[day % memories.length] : null;
  const ways = [
    ['/family/ask', 'Ask', `Ask anything. Remi answers only from what ${name} said.`],
    ['/family/story', 'Her story', 'Every chapter, in her own words.'],
    ['/family/letters', 'Letters', 'What she sealed for after, and for particular days.'],
    ...(consent?.allow_persona ? [['/family/talk-with', `Talk with ${name}`, 'An AI that speaks as her, from her stories. Always marked as AI.']] : []),
    ['/family/book', 'The book', 'Her story as a book you can print.'],
    ['/family/export', 'Keep everything', 'Download all of it: her voice, her words, the photos.'],
  ];
  return (
    <div>
      <p className="f-eyebrow">In memory of</p>
      <h1 className="mt-1 f-h1">{h.patient_name}</h1>
      {h.passed_on && <p className="text-dim">{h.passed_on}</p>}
      {today && (
        <section className="mt-8">
          <h2 className="f-h2">A story for today</h2>
          <div className="mt-3"><MemoryCard m={today} name={name} /></div>
        </section>
      )}
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {ways.map(([href, title, blurb]) => (
          <li key={href}><Link href={href} className="block rounded-xl border bg-surface p-5 hover:bg-leaf"><span className="f-h3">{title}</span><span className="mt-1 block text-sm text-dim">{blurb}</span></Link></li>
        ))}
      </ul>
    </div>
  );
}
