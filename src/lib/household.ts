import 'server-only';
import { redirect } from 'next/navigation';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { hashDeviceToken } from '@/lib/device-token';

export async function requireFamily() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await sb.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle();
  if (!data) redirect('/family/setup');
  return { sb, user, householdId: data.household_id as string };
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
