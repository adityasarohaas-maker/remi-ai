import { lookupInvite } from './actions';
import { AcceptInvite } from './accept';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await lookupInvite(token);
  if (!info) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-2xl font-semibold">This invite isn&apos;t valid any more</h1>
        <p className="mt-3 text-stone-600">It may have expired or already been used. Ask the family member who sent it for a new one.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-3xl font-semibold">Join {info.householdName}&apos;s Remi</h1>
      <p className="mt-3 text-stone-600">Hello {info.displayName}. Sign in or create an account with <b>{info.email}</b> to hear her stories.</p>
      <AcceptInvite token={token} email={info.email} />
    </main>
  );
}
