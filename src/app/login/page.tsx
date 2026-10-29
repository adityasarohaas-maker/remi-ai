'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { PRODUCT_NAME } from '@/core/brand';
import type { Typing } from '@/core/forest-motion';
import { Forest } from '../_site/forest/forest';
import { BrandMark } from '../_site/brand-mark';

/** Sign in, in the forest: Kodi watches the email being typed and covers his eyes for the password. */
export default function LoginPage() {
  return <Suspense fallback={null}><Login /></Suspense>;
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'in' | 'up'>(params.get('mode') === 'create' ? 'up' : 'in');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState<Typing>('idle');
  const [typedLen, setTypedLen] = useState(0);

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
    <main className="forest">
      <Forest mode="signin" typing={typing} typedLen={typedLen} />
      <div className="f-si-shade" aria-hidden />
      <div className={`f-bubble f-caveat ${typing === 'password' ? 'on' : ''}`} aria-hidden>I&apos;m not looking!</div>
      <section className="f-si-card f-glass">
        <Link href="/" className="f-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 18, letterSpacing: '-.02em', color: 'inherit', textDecoration: 'none' }}><BrandMark />{PRODUCT_NAME}</Link>
        <h1>{mode === 'in' ? 'Welcome back' : 'Create your family account'}</h1>
        <p className="f-si-sub">{mode === 'in' ? 'Sign in to hear how the week has gone, and the stories that arrived.' : `Ten minutes to set up. Then ${PRODUCT_NAME} starts listening.`}</p>
        <form onSubmit={submit}>
          <label className="f-si-field"><span>Email</span>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com"
              onFocus={(e) => { setTyping('email'); setTypedLen(e.currentTarget.value.length); }}
              onInput={(e) => { setTyping('email'); setTypedLen(e.currentTarget.value.length); }}
              onBlur={() => setTyping('idle')} />
          </label>
          <label className="f-si-field"><span>Password</span>
            <input id="password" name="password" type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder={mode === 'in' ? 'Your password' : 'Choose a password (8+ characters)'}
              onFocus={() => setTyping('password')} onInput={() => setTyping('password')} onBlur={() => setTyping('idle')} />
          </label>
          {error && <p role="alert" className="f-si-err">{error}</p>}
          <button disabled={busy} className="f-btn f-si-btn">{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="f-si-alt">
          {mode === 'in' ? <>New here? <button type="button" onClick={() => setMode('up')}>Set up {PRODUCT_NAME} for your family</button></> : <>Have an account? <button type="button" onClick={() => setMode('in')}>Sign in</button></>}
        </p>
      </section>
    </main>
  );
}
