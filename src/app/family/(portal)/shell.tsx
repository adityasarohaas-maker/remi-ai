import Link from 'next/link';
import type { ReactNode } from 'react';
import { PRODUCT_NAME } from '@/core/brand';
import { NightStage } from '@/app/_site/night-stage';
import { BrandMark } from '@/app/_site/brand-mark';
import { PortalNav } from './portal-nav';

export type ShellProps = {
  name: string;
  passed: boolean;
  passedOn?: string | null;
  nav: readonly (readonly [string, string])[];
  /** the demo family's strip, when this is the demo household */
  banner?: ReactNode;
  children: ReactNode;
};

/** The family portal in the forest: a glass top bar with the places to go, the page below, the still woods behind. */
export function PortalShell({ name, passed, passedOn, nav, banner, children }: ShellProps) {
  return (
    <div className="forest f-app">
      <NightStage />
      <div className="f-shell">
        <header className="f-topbar">
          <div className="f-topbar-in">
            <div className="f-topbar-row">
              <Link href="/family" className="f-brand"><BrandMark />{PRODUCT_NAME}</Link>
              <span className="f-whose">{passed ? <>In memory of <b>{name}</b>{passedOn ? ` · ${passedOn}` : ''}</> : <>Keeping <b>{name}</b>&apos;s life</>}</span>
            </div>
            <PortalNav items={nav} />
          </div>
        </header>
        {banner && <div className="f-banner">{banner}</div>}
        <main className="f-page">{children}</main>
      </div>
    </div>
  );
}
