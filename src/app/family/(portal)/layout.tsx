import { requireFamily } from '@/lib/household';
import { isDemoHousehold } from '@/core/demo';
import { seeAfter, seeBefore } from '@/app/demo-actions';
import { PortalShell } from './shell';

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
  const banner = isDemoHousehold(householdId) ? (
    <div>
      <span>Demo family. {passed ? 'This is the portal after Avni has passed.' : 'This is the portal while Avni is here.'} Changes aren&apos;t saved.</span>
      <form action={passed ? seeBefore : seeAfter}><button>{passed ? 'Back to before' : 'See after'}</button></form>
    </div>
  ) : undefined;
  return (
    <PortalShell name={name} passed={passed} passedOn={h?.passed_on as string | null} nav={nav} banner={banner}>{children}</PortalShell>
  );
}
