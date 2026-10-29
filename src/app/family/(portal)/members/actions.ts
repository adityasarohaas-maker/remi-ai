'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { newDeviceToken, hashDeviceToken } from '@/lib/device-token';
import { sendEmail, escapeHtml } from '@/lib/email';
import { field } from '@/lib/form';
import { canInvite, inviteExpiry, type Role } from '@/core/roles';

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
}

/** Makes an invite link; emails it when email is set up, and always hands it back to show on screen. */
export async function invite(form: FormData): Promise<{ link?: string; error?: string }> {
  const { role, householdId, sb } = await requireAdmin();
  const email = field(form, 'email', 120).toLowerCase();
  const displayName = field(form, 'display_name', 60);
  const invitedRole = (field(form, 'role', 10) === 'admin' ? 'admin' : 'family') as Role;
  if (!email.includes('@') || !displayName) return { error: 'A name and an email are needed.' };
  if (!canInvite(role, invitedRole)) return { error: 'Only the owner can invite another admin.' };

  const token = newDeviceToken();
  const { error } = await sb.from('invites').insert({
    household_id: householdId, email, display_name: displayName, role: invitedRole,
    token_hash: hashDeviceToken(token), expires_at: inviteExpiry(new Date()).toISOString(),
  });
  if (error) return { error: error.message };
  const link = `${baseUrl()}/invite/${token}`;
  const { data: h } = await sb.from('households').select('preferred_name').eq('id', householdId).single();
  await sendEmail(email, `You're invited to ${h?.preferred_name ?? 'the family'}'s Remi`,
    `<p>${escapeHtml(displayName)}, you've been invited to join ${escapeHtml(h?.preferred_name ?? 'the family')}'s Remi: her stories, in her own voice.</p><p><a href="${link}">Accept the invite</a> (it lasts seven days).</p>`);
  revalidatePath('/family/members');
  return { link };
}

export async function removeMember(form: FormData) {
  const { householdId, role, user } = await requireAdmin();
  const userId = field(form, 'user_id', 60);
  if (!userId || userId === user.id) return;
  const db = supabaseAdmin();
  const { data: target } = await db.from('household_members').select('role').eq('household_id', householdId).eq('user_id', userId).maybeSingle();
  if (!target || target.role === 'owner' || (target.role === 'admin' && role !== 'owner')) return;
  await db.from('household_members').delete().eq('household_id', householdId).eq('user_id', userId);
  revalidatePath('/family/members');
}

export async function cancelInvite(form: FormData) {
  const { sb } = await requireAdmin();
  const id = field(form, 'id', 60);
  if (id) await sb.from('invites').delete().eq('id', id);
  revalidatePath('/family/members');
}
