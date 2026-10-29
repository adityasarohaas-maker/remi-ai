import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail, escapeHtml } from '@/lib/email';
import { newDeviceToken, hashDeviceToken } from '@/lib/device-token';
import { dueToOpen, letterExpiry } from '@/core/letters';
import { localParts, safeTimeZone } from '@/core/time';
import type { Visibility } from '@/core/types';

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
}

type SealedRow = {
  id: string; title: string; visibility: Visibility; visible_to: string[]; open_on: string | null; open_event_id: string | null;
  opened_at: string | null; recipient_name: string | null; recipient_email: string | null;
};

/** Opens every sealed memory whose day has come for one household, and tells the people it is for. */
export async function openDueLetters(householdId: string): Promise<{ opened: number }> {
  const db = supabaseAdmin();
  const { data: h } = await db.from('households').select('preferred_name, status, timezone').eq('id', householdId).single();
  if (!h) return { opened: 0 };
  const [{ data: rows }, { data: events }, { data: members }] = await Promise.all([
    db.from('memories').select('id, title, visibility, visible_to, open_on, open_event_id, opened_at, recipient_name, recipient_email')
      .eq('household_id', householdId).is('opened_at', null).in('visibility', ['after_death', 'on_date', 'on_event']),
    db.from('life_events').select('id').eq('household_id', householdId).not('happened_on', 'is', null),
    db.from('household_members').select('user_id, display_name, email').eq('household_id', householdId),
  ]);
  const ctx = {
    status: (h.status as 'living' | 'passed') ?? 'living',
    today: localParts(new Date(), safeTimeZone(h.timezone as string)).day,
    happenedEventIds: (events ?? []).map((e) => e.id as string),
  };
  let opened = 0;
  for (const r of (rows ?? []) as SealedRow[]) {
    const rule = { visibility: r.visibility, visibleTo: r.visible_to ?? [], openOn: r.open_on, openEventId: r.open_event_id, openedAt: r.opened_at };
    if (!dueToOpen(rule, ctx)) continue;
    const now = new Date();
    const { error } = await db.from('memories').update({ opened_at: now.toISOString() }).eq('id', r.id).is('opened_at', null);
    if (error) continue;
    opened++;
    const name = h.preferred_name as string;
    const subject = `${name} left something for you`;
    const to = (members ?? []).filter((m) => m.email && (!rule.visibleTo.length || rule.visibleTo.includes(m.user_id as string)));
    await Promise.allSettled(to.map((m) => sendEmail(m.email as string, subject,
      `<p>${escapeHtml(m.display_name as string ?? '')}, ${escapeHtml(name)} left a memory for you: <b>${escapeHtml(r.title)}</b>.</p><p><a href="${baseUrl()}/family/story#m-${r.id}">Open it in the family portal</a>.</p>`)));
    if (r.recipient_email) {
      const token = newDeviceToken();
      await db.from('letter_links').insert({ memory_id: r.id, token_hash: hashDeviceToken(token), expires_at: letterExpiry(now).toISOString() });
      await sendEmail(r.recipient_email, subject,
        `<p>${escapeHtml(r.recipient_name ?? '')}, ${escapeHtml(name)} left you a letter, in her own voice.</p><p><a href="${baseUrl()}/letter/${token}">Open it</a>. The link opens once and stays open for a day; ask the family for another if you need it.</p>`);
    }
  }
  return { opened };
}

/** A fresh link for a sealed-and-opened letter; shown on screen when email isn't set up. */
export async function makeLetterLink(memoryId: string): Promise<string> {
  const token = newDeviceToken();
  await supabaseAdmin().from('letter_links').insert({ memory_id: memoryId, token_hash: hashDeviceToken(token), expires_at: letterExpiry(new Date()).toISOString() });
  return `${baseUrl()}/letter/${token}`;
}
