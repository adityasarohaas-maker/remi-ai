import { requireDevice } from '@/lib/household';
import { supabaseAdmin } from '@/lib/supabase/server';
import { signedRecordingUrl } from '@/lib/clips';
import { groupIntoChapters } from '@/core/chapters';
import { memoryFromRow, MEMORY_COLUMNS, type MemoryDbRow } from '@/core/memory-row';

/** Her own stories, for her to hear again: only what she told for everyone, and only what the family hasn't doubted. */
export async function GET(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const db = supabaseAdmin();
  const { data } = await db.from('memories').select(MEMORY_COLUMNS).eq('household_id', householdId)
    .eq('visibility', 'everyone').not('recording_id', 'is', null).order('created_at', { ascending: false }).limit(60);
  const memories = ((data ?? []) as MemoryDbRow[]).map(memoryFromRow).filter((m) => m.confidence === 'sure' || m.verifiedBy);
  const chapters = groupIntoChapters(memories);
  const stories = await Promise.all(chapters.flatMap((c) => c.memories.slice(0, 8).map(async (m) => ({
    id: m.id, title: m.title, chapter: c.title, year: m.yearFrom, quote: m.quote,
    url: m.recordingId ? await signedRecordingUrl(m.recordingId) : null,
  }))));
  return Response.json({ stories: stories.filter((s) => s.url) });
}
