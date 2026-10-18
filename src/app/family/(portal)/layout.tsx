import Link from 'next/link';
import { requireFamily } from '@/lib/household';

const NAV = [
  ['/family', 'Today'], ['/family/people', 'People'], ['/family/routine', 'Routine'],
  ['/family/guidance', 'Hard questions'], ['/family/tablet', 'Tablet'], ['/family/profile', 'Profile'],
] as const;

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { sb, householdId } = await requireFamily();
  const { data: h } = await sb.from('households').select('preferred_name').eq('id', householdId).single();
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">Remi AI · {h?.preferred_name}</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            {NAV.map(([href, label]) => <Link key={href} href={href} className="hover:underline">{label}</Link>)}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
