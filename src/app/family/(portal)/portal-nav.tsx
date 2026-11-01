'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** The portal's places, as a row of pills; the one you are on is gold. */
export function PortalNav({ items }: { items: readonly (readonly [string, string])[] }) {
  const path = usePathname();
  return (
    <nav className="f-nav" aria-label="Portal">
      {items.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
