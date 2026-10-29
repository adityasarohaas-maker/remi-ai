'use client';
import { useState } from 'react';
import { invite } from './actions';

export function InviteForm({ mayInviteAdmin }: { mayInviteAdmin: boolean }) {
  const [result, setResult] = useState<{ link?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const r = await invite(new FormData(form));
    setBusy(false);
    setResult(r);
    if (r.link) form.reset();
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
      <input name="display_name" required placeholder="Name (as she'd say it)" className="rounded-lg border px-3 py-2" />
      <input name="email" type="email" required placeholder="Email" className="rounded-lg border px-3 py-2" />
      <select name="role" className="rounded-lg border px-3 py-2">
        <option value="family">Family</option>
        {mayInviteAdmin && <option value="admin">Admin</option>}
      </select>
      <button disabled={busy} className="rounded-lg bg-garden px-4 py-2 text-white disabled:opacity-60">{busy ? 'Inviting…' : 'Invite'}</button>
      {result?.error && <p role="alert" className="text-red-700 sm:col-span-4">{result.error}</p>}
      {result?.link && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm sm:col-span-4">
          Invite link (copy and send it if the email doesn&apos;t arrive): <code className="break-all">{result.link}</code>
        </p>
      )}
    </form>
  );
}
