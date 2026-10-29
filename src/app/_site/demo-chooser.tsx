'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { startDemo } from '@/app/demo-actions';
import { demoLinks } from '@/core/demo-links';

/** The gold "Try the demo" button and its glass chooser: her tablet (when there is one) and the family portal. */
export function DemoChooser({ token, name }: { token: string | undefined; name: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const links = demoLinks(token);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button className="f-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">Try the demo</button>
      {open && (
        <div className="f-chooser f-glass" role="menu">
          {links.tablet && (
            <Link href={links.tablet} role="menuitem">{name}&apos;s tablet<small>Tap Start, then just talk</small></Link>
          )}
          <form action={startDemo}>
            <button type="submit" role="menuitem">The family portal<small>Her stories, in her voice, as the family sees them</small></button>
          </form>
        </div>
      )}
    </div>
  );
}
