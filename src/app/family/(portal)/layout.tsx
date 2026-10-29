import Link from 'next/link';
import { requireFamily } from '@/lib/household';
import { isDemoHousehold } from '@/core/demo';
import { seeAfter, seeBefore } from '@/app/demo-actions';

const NAV = [
  ['/family', 'Today'], ['/family/story', 'Story'], ['/family/ask', 'Ask'], ['/family/questions', 'Questions'], ['/family/photos', 'Photos'], ['/family/people', 'People'],
  ['/family/routine', 'Routine'], ['/family/guidance', 'Hard questions'], ['/family/tablet', 'Tablet'], ['/family/members', 'Members'], ['/family/consent', 'Her say'], ['/family/profile', 'Profile'],
] as const;

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { sb, householdId } = await requireFamily();
  const [{ data: h }, { data: consent }] = await Promise.all([
    sb.from('households').select('preferred_name, status, passed_on').eq('id', householdId).single(),
    sb.from('consents').select('allow_persona').eq('household_id', householdId).maybeSingle(),
  ]);
  const passed = h?.status === 'passed';
  const name = h?.preferred_name ?? '';
  // after she has passed, the portal is a place to remember her
  const nav: readonly (readonly [string, string])[] = passed
    ? [['/family/remember', 'Remember'], ['/family/ask', 'Ask'], ['/family/story', 'Story'], ['/family/letters', 'Letters'],
       ...(consent?.allow_persona ? [[`/family/talk-with`, `Talk with ${name}`] as const] : []),
       ['/family/book', 'Book'], ['/family/export', 'Keep everything'], ['/family/members', 'Members'], ['/family/profile', 'Profile']]
    : NAV;
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">{passed ? `In memory of ${name}${h?.passed_on ? ` · ${h.passed_on}` : ''}` : `Remi AI · ${name}`}</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            {nav.map(([href, label]) => <Link key={href} href={href} className="hover:underline">{label}</Link>)}
          </nav>
        </div>
      </header>
      {isDemoHousehold(householdId) && (
        <div className="bg-amber-50 text-sm">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-2">
            <span>Demo family. {passed ? 'This is the portal after Avni has passed.' : 'This is the portal while Avni is here.'}</span>
            <form action={passed ? seeBefore : seeAfter}><button className="rounded-lg border border-amber-400 px-3 py-1 hover:bg-amber-100">{passed ? 'Back to before' : 'See after'}</button></form>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
