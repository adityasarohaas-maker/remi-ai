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

export function letterExpiry(now: Date): Date {
  return new Date(now.getTime() + LETTER_LINK_DAYS * 24 * 60 * 60 * 1000);
}
