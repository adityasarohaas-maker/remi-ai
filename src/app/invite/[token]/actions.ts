'use server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { hashDeviceToken } from '@/lib/device-token';

export type InviteInfo = { householdName: string; displayName: string; email: string; role: string } | null;

/** What the link is for, shown before they sign in. Null when it is unknown, used or expired. */
export async function lookupInvite(token: string): Promise<InviteInfo> {
  if (!token || token.length > 200) return null;
  const db = supabaseAdmin();
  const { data } = await db.from('invites').select('email, display_name, role, expires_at, accepted_at, household:households(preferred_name)')
    .eq('token_hash', hashDeviceToken(token)).maybeSingle();
  if (!data || data.accepted_at || new Date(data.expires_at) < new Date()) return null;
  const h = data.household as unknown as { preferred_name: string } | null;
  return { householdName: h?.preferred_name ?? 'the family', displayName: data.display_name, email: data.email, role: data.role };
}

/** The signed-in user takes the invite: they join the household with the name and role it carries. */
export async function acceptInvite(token: string): Promise<{ ok: true } | { error: string }> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Please sign in first.' };
  const db = supabaseAdmin();
  const { data: inv } = await db.from('invites').select('id, household_id, email, display_name, role, expires_at, accepted_at')
    .eq('token_hash', hashDeviceToken(token)).maybeSingle();
  if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) return { error: 'This invite is no longer valid.' };
  // the link is for the person it was sent to, not whoever holds it
  if ((user.email ?? '').toLowerCase() !== String(inv.email).toLowerCase()) return { error: `This invite is for ${inv.email}. Sign in with that address.` };
  const { data: existing } = await db.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle();
  if (existing && existing.household_id !== inv.household_id) return { error: 'This account already belongs to another family.' };
  // already in this family: an invite never changes someone's role, or a stray link could demote the owner
  if (existing) {
    await db.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', inv.id);
    return { ok: true };
  }
  const { error } = await db.from('household_members').insert({
    household_id: inv.household_id, user_id: user.id, role: inv.role, display_name: inv.display_name, email: user.email ?? inv.email,
  });
  if (error) return { error: error.message };
  await db.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', inv.id);
  return { ok: true };
}
