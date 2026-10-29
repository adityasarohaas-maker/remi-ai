// The memory book: what goes to print. Only what the whole family may read, in her chapters.
import { groupIntoChapters, type Chapter } from './chapters';
import type { Memory } from './types';

/** Everyone's memories plus opened sealed ones; never remi-only, never still-sealed, never doubted-and-unverified. */
export function bookMemories(memories: Memory[]): Chapter[] {
  const printable = memories.filter((m) => {
    if (m.visibility === 'remi_only' || m.visibility === 'members') return false;
    if (m.visibility !== 'everyone' && !m.openedAt) return false;
    if (m.confidence === 'unsure' && !m.verifiedBy) return false;
    return true;
  });
  return groupIntoChapters(printable);
}

/** The file name for the whole archive. */
export function exportFileName(preferredName: string, now: Date): string {
  const slug = preferredName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'remi';
  return `remi-${slug}-${now.toISOString().slice(0, 10)}.zip`;
}
