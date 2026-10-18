import { supabaseServer } from '@/lib/supabase/server';
import { generateDigest } from '@/lib/digest';

export const maxDuration = 60;

export async function POST() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: 'sign in' }, { status: 401 });
  const { data: m } = await sb.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle();
  if (!m) return Response.json({ error: 'no household' }, { status: 404 });
  try {
    return Response.json(await generateDigest(m.household_id));
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'The note could not be written right now. Please try again.' }, { status: 502 });
  }
}
