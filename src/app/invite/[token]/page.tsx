import Link from 'next/link';
import { lookupInvite } from './actions';
import { AcceptInvite } from './accept';
import { PRODUCT_NAME } from '@/core/brand';
import { NightStage } from '@/app/_site/night-stage';
import { BrandMark } from '@/app/_site/brand-mark';

/** An invitation, opened in the forest: one glass card on the stage. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await lookupInvite(token);
  return (
    <main className="forest f-app">
      <NightStage />
      <section className="f-card-page f-glass">
        <Link href="/" className="f-brand"><BrandMark />{PRODUCT_NAME}</Link>
        {info ? (
          <>
            <h1>Join {info.householdName}&apos;s {PRODUCT_NAME}</h1>
            <p className="f-sub">Hello {info.displayName}. Sign in or create an account with <b className="text-ink">{info.email}</b> to hear her stories.</p>
            <AcceptInvite token={token} email={info.email} />
          </>
        ) : (
          <>
            <h1>This invite isn&apos;t valid any more</h1>
            <p className="f-sub">It may have expired or already been used. Ask the family member who sent it for a new one.</p>
          </>
        )}
      </section>
    </main>
  );
}
