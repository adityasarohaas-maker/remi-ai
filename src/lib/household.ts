import 'server-only';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { hashDeviceToken } from '@/lib/device-token';
import { canAdmin, type Role } from '@/core/roles';
import { isDemoHousehold } from '@/core/demo';

export async function requireFamily() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await sb.from('household_members').select('household_id, role, display_name').eq('user_id', user.id).maybeSingle();
  if (!data) redirect('/family/setup');
  const role = (data.role as Role) ?? 'family';
  return { sb, user, householdId: data.household_id as string, role, displayName: (data.display_name as string | null) ?? null };
}

/** A page or action only an owner or admin may use. */
export async function requireAdmin() {
  const fam = await requireFamily();
  if (!canAdmin(fam.role)) redirect('/family');
  return fam;
}

/** The shared demo family looks real but keeps nothing: back to the same page, with the change not made. */
async function refuseDemo(householdId: string): Promise<void> {
  if (!isDemoHousehold(householdId)) return;
  const from = (await headers()).get('referer');
  let back = '/family';
  try { if (from && new URL(from).pathname.startsWith('/family')) back = new URL(from).pathname; } catch { /* a bad header: go home */ }
  redirect(back);
}

/** A family action that changes something. */
export async function requireWriter() {
  const fam = await requireFamily();
  await refuseDemo(fam.householdId);
  return fam;
}

/** An owner or admin action that changes something. */
export async function requireAdminWriter() {
  const fam = await requireAdmin();
  await refuseDemo(fam.householdId);
  return fam;
}

export async function getDeviceHousehold(token: string): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const { data } = await supabaseAdmin()
    .from('devices').select('household_id')
    .eq('token_hash', hashDeviceToken(token)).is('revoked_at', null).maybeSingle();
  return (data?.household_id as string | undefined) ?? null;
}

export async function requireDevice(req: Request): Promise<string | null> {
  return getDeviceHousehold(req.headers.get('x-device-token') ?? '');
}

/** For anything that adds to her words or speaks for her: once she has passed, her tablet can only play them back. */
export async function requireLivingDevice(req: Request): Promise<string | null> {
  const householdId = await requireDevice(req);
  if (!householdId) return null;
  const { data } = await supabaseAdmin().from('households').select('status').eq('id', householdId).maybeSingle();
  return data?.status === 'living' ? householdId : null;
}
