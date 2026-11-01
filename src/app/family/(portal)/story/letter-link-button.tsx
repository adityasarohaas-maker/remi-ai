'use client';
import { useState } from 'react';
import { newLetterLink } from './actions';

/** Makes a letter link and shows it once, here, to the admin who asked. */
export function LetterLinkButton({ memoryId }: { memoryId: string }) {
  const [link, setLink] = useState<string | null | 'busy' | 'no'>(null);
  async function make() {
    setLink('busy');
    const l = await newLetterLink(memoryId);
    setLink(l ?? 'no');
  }
  if (link === 'no') return <span className="text-xs text-dim">Can&apos;t make a link for this one.</span>;
  if (link && link !== 'busy') return <code className="break-all text-xs">{link}</code>;
  return <button onClick={make} disabled={link === 'busy'} className="text-garden underline disabled:opacity-60">{link === 'busy' ? '…' : 'Make a link to send'}</button>;
}
