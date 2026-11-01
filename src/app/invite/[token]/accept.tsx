'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { acceptInvite } from './actions';

export function AcceptInvite({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'up' | 'in'>('up');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    const sb = supabaseBrowser();
    const { error: authError } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    if (authError) { setBusy(false); return setError(authError.message); }
    const r = await acceptInvite(token);
    setBusy(false);
    if ('error' in r) return setError(r.error);
    router.push('/family/story');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <input type="email" value={email} readOnly className="w-full rounded-lg border bg-panel px-4 py-3 text-dim" />
      <input name="password" type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Password (8+ characters)" className="w-full rounded-lg border px-4 py-3" />
      {error && <p role="alert" className="text-alarm">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-garden px-4 py-3 text-night disabled:opacity-60">
        {busy ? 'Please wait…' : mode === 'in' ? 'Sign in and join' : 'Create account and join'}
      </button>
      <button type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')} className="text-garden underline">
        {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
      </button>
    </form>
  );
}
