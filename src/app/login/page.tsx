'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email'));
    const password = String(f.get('password'));
    const sb = supabaseBrowser();
    const { error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    router.push('/family');
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-3xl font-semibold">{mode === 'in' ? 'Family sign in' : 'Create a family account'}</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className="w-full rounded-lg border px-4 py-3" />
        <input name="password" type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Password (8+ characters)" className="w-full rounded-lg border px-4 py-3" />
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-teal-800 px-4 py-3 text-white disabled:opacity-60">
          {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <button onClick={() => setMode(mode === 'in' ? 'up' : 'in')} className="mt-4 text-teal-800 underline">
        {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
      </button>
    </main>
  );
}
