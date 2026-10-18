import { requireDevice } from '@/lib/household';
import { supabaseDeps } from '@/lib/deps';
import { helpSentMessage } from '@/core/messages';

export async function POST(req: Request) {
  const householdId = await requireDevice(req);
  if (!householdId) return Response.json({ error: 'unknown device' }, { status: 401 });
  const deps = supabaseDeps();
  const now = deps.now();
  if ((await deps.countRecentEvents(householdId, 'alert', new Date(now.getTime() - 60_000))) >= 5) {
    return Response.json({ error: 'too many requests' }, { status: 429 });
  }
  const { household: h } = await deps.loadContext(householdId, now);
  await deps.alert(householdId, 'help_button', `${h.preferredName} pressed "I need help" on the tablet.`);
  return Response.json({ reply: helpSentMessage(h.language, h.primaryContactName) });
}
