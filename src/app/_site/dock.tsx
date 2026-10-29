import Link from 'next/link';
import { PRODUCT_NAME, demoButtonShown } from '@/core/brand';
import { BrandMark } from './brand-mark';
import { DemoChooser } from './demo-chooser';

/** The floating glass dock: brand, three section links, Sign in, and the demo (or Get started once the demo window closes). */
export function Dock({ demoToken }: { demoToken: string | undefined }) {
  const demo = demoButtonShown(new Date()); // decided at render, never at module load
  return (
    <nav className="f-dock" aria-label="Site">
      <Link href="/" className="f-brand"><BrandMark />{PRODUCT_NAME}</Link>
      <div className="f-links">
        <a href="#how">How it works</a>
        <a href="#places">For families</a>
        <a href="#safety">Safety</a>
      </div>
      <div className="f-right">
        <Link href="/login">Sign in</Link>
        {demo ? <DemoChooser token={demoToken} name="Avni" /> : <Link href="/login?mode=create" className="f-btn">Get started</Link>}
      </div>
    </nav>
  );
}
