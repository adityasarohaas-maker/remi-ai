import type { MemoryRule } from './types';

export interface ViewContext {
  /** null: ignore the named-people check (used to decide when a sealed memory is due to open). */
  viewerId: string | null;
  status: 'living' | 'passed';
  /** YYYY-MM-DD in the household's timezone. */
  today: string;
  happenedEventIds: string[];
}

/** Mirrors public.can_see_memory in 0005_legacy.sql; keep the two in step. */
export function memoryOpen(m: MemoryRule, ctx: ViewContext): boolean {
  const named = ctx.viewerId === null || m.visibleTo.length === 0 || m.visibleTo.includes(ctx.viewerId);
  switch (m.visibility) {
    case 'everyone': return true;
    case 'members': return ctx.viewerId === null || m.visibleTo.includes(ctx.viewerId);
    case 'after_death': return ctx.status === 'passed' && named;
    case 'on_date': return m.openOn !== null && ctx.today >= m.openOn && named;
    case 'on_event': return m.openEventId !== null && ctx.happenedEventIds.includes(m.openEventId) && named;
    case 'remi_only': return false;
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** What a family member sees in place of a sealed memory. */
export function sealedLabel(m: MemoryRule, names: Record<string, string>, events: Record<string, string> = {}): string {
  const who = m.visibleTo.map((id) => names[id] ?? 'someone').join(' and ');
  switch (m.visibility) {
    case 'everyone': return '';
    case 'members': return `For ${who} only`;
    case 'after_death': return who ? `For ${who}, after she's gone` : "Opens after she's gone";
    case 'on_date': return m.openOn ? `Sealed until ${shortDate(m.openOn)}` : 'Sealed';
    case 'on_event': return m.openEventId && events[m.openEventId] ? `Opens on ${events[m.openEventId]}` : 'Opens on a day the family will mark';
    case 'remi_only': return 'Kept only with Remi';
  }
}
