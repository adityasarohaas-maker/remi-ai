// Sealed memories and letters: when they open, and the links that carry them to people without accounts.
import { memoryOpen } from './visibility';
import type { MemoryRule } from './types';

export const LETTER_LINK_DAYS = 30;

/** Sealed until now, and now its day has come: open it (once) and tell the people it is for. */
export function dueToOpen(
  m: MemoryRule & { openedAt: string | null },
  ctx: { status: 'living' | 'passed'; today: string; happenedEventIds: string[] },
): boolean {
  if (m.openedAt) return false;
  if (m.visibility === 'everyone' || m.visibility === 'members' || m.visibility === 'remi_only') return false;
  return memoryOpen(m, { ...ctx, viewerId: null });
}

/** A link may only ever carry an opened letter addressed to someone outside the family. */
export function canMakeLetterLink(m: { visibleTo: string[]; recipientName: string | null; openedAt: string | null }): boolean {
  return !!m.openedAt && !!m.recipientName && m.visibleTo.length === 0;
}

export const LETTER_REOPEN_HOURS = 24;
/** Single-use, with a day to come back to it (a refresh, a second listen), then gone. */
export function letterLinkState(link: { expiresAt: string; usedAt: string | null }, now: Date): 'fresh' | 'open' | 'expired' {
  if (new Date(link.expiresAt) < now) return 'expired';
  if (!link.usedAt) return 'fresh';
  return now.getTime() - new Date(link.usedAt).getTime() < LETTER_REOPEN_HOURS * 3600 * 1000 ? 'open' : 'expired';
}

export function letterExpiry(now: Date): Date {
  return new Date(now.getTime() + LETTER_LINK_DAYS * 24 * 60 * 60 * 1000);
}
