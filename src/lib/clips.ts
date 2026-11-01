import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/server';

export const CLIP_URL_SECONDS = 600;

/**
 * A short-lived link to the clip behind a memory. The memory is read with the viewer's own client first,
 * so row-level security decides whether they may hear it; only then does the server sign the file.
 */
export async function signedClipUrl(sb: SupabaseClient, memoryId: string): Promise<string | null> {
  const { data: m } = await sb.from('memories').select('recording_id').eq('id', memoryId).maybeSingle();
  if (!m?.recording_id) return null;
  return signedRecordingUrl(m.recording_id as string);
}

/** Signs a recording the caller has already been allowed to hear. */
export async function signedRecordingUrl(recordingId: string, householdId?: string): Promise<string | null> {
  const db = supabaseAdmin();
  const query = db.from('recordings').select('storage_path').eq('id', recordingId);
  const { data: r } = await (householdId ? query.eq('household_id', householdId) : query).maybeSingle();
  if (!r?.storage_path) return null;
  const { data, error } = await db.storage.from('voice').createSignedUrl(r.storage_path as string, CLIP_URL_SECONDS);
  if (error) { console.error('clip sign failed', error.message); return null; }
  return data?.signedUrl ?? null;
}
