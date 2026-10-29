import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { extractNewMemories } from '@/lib/memories';

export const maxDuration = 120;

/** The tablet has been quiet for a while after a talk: keep what she told Remi. */
export async function POST(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  if (!(await supabaseDeps().takeRateToken(householdId, 'conversation-end', 1, 120))) {
    return Response.json({ created: 0, skipped: 'recent' });
  }
  try {
    return Response.json(await extractNewMemories(householdId));
  } catch (e) {
    console.error('extraction failed', (e as Error).message);
    return Response.json({ error: 'extraction failed' }, { status: 500 });
  }
}
