'use client';
import { useActionState, useState } from 'react';
import { createDevice } from './actions';

export function NewDevice() {
  const [state, action, pending] = useActionState(createDevice, null);
  const [copied, setCopied] = useState(false);
  const full = state?.url ? `${window.location.origin}${state.url}` : '';
  return (
    <div className="mt-6 max-w-xl rounded-xl border bg-white p-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="grow">Name this tablet<input name="label" placeholder="e.g. Living room tablet" className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <button disabled={pending} className="rounded-lg bg-teal-800 px-4 py-2 text-white disabled:opacity-60">{pending ? 'Creating…' : 'Set up a tablet'}</button>
      </form>
      {state?.error && <p role="alert" className="mt-3 text-red-700">{state.error}</p>}
      {full && (
        <div className="mt-4 rounded-lg bg-teal-50 p-3">
          <p className="text-sm">Open this link on the tablet and add it to the home screen. <strong>It is shown only once.</strong></p>
          <p className="mt-2 break-all font-mono text-sm">{full}</p>
          <button
            type="button"
            onClick={async () => { await navigator.clipboard.writeText(full); setCopied(true); }}
            className="mt-2 rounded-lg border px-3 py-1 text-sm"
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}
