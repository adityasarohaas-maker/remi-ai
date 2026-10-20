import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { chatText, chatStream, MODELS } from '@/lib/nebius';
import { sendAlert } from '@/lib/alerts';
import { localParts, dayRangeUtc, safeTimeZone } from '@/core/time';
import type { CoreDeps } from '@/core/talk';
import type { HouseholdContext, RoutineItem, Approach } from '@/core/types';

// A model that hasn't started its reply by now has stalled (it happens); the backup answers instead.
const FIRST_WORDS_MS = 3500;

async function withBackup(purpose: 'story' | undefined, run: (model: string) => Promise<string>, mayRetry: () => boolean): Promise<string> {
  const model = purpose === 'story' ? MODELS.story() : MODELS.chat();
  try {
    return await run(model);
  } catch (e) {
    const backup = purpose === 'story' ? MODELS.chat() : MODELS.backup();
    if (!backup || backup === model || !mayRetry()) throw e;
    console.error(`chat model ${model} failed, trying ${backup}`, e);
    return run(backup);
  }
}

export function supabaseDeps(): CoreDeps {
  const db = supabaseAdmin();
  return {
    now: () => new Date(),

    async loadContext(householdId, now): Promise<HouseholdContext> {
      const [h, people, routine, guidance] = await Promise.all([
        db.from('households').select('*').eq('id', householdId).single(),
        db.from('people').select('id, name, relation, notes, is_deceased').eq('household_id', householdId).order('created_at'),
        db.from('routine_items').select('id, time_of_day, kind, label, spoken_message').eq('household_id', householdId).eq('active', true),
        db.from('sensitive_guidance').select('id, topic, trigger_words, approach, family_script, caller:people(name)').eq('household_id', householdId),
      ]);
      if (h.error) throw h.error;
      const tz = safeTimeZone(h.data.timezone as string);
      const { start, end } = dayRangeUtc(localParts(now, tz).day, tz);
      const done = await db.from('events').select('payload').eq('household_id', householdId).eq('type', 'reminder_done')
        .gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
      return {
        household: {
          id: h.data.id, patientName: h.data.patient_name, preferredName: h.data.preferred_name,
          language: h.data.language, timezone: tz, about: h.data.about, homeAddress: h.data.home_address,
          primaryContactName: h.data.primary_contact_name, primaryContactPhone: h.data.primary_contact_phone,
        },
        people: (people.data ?? []).map((p) => ({ id: p.id, name: p.name, relation: p.relation, notes: p.notes, isDeceased: p.is_deceased })),
        routine: (routine.data ?? []).map((r) => ({
          id: r.id, timeOfDay: r.time_of_day, kind: r.kind as RoutineItem['kind'], label: r.label, spokenMessage: r.spoken_message,
        })),
        doneIds: (done.data ?? []).map((e) => (e.payload as { routineItemId: string }).routineItemId),
        guidance: (guidance.data ?? []).map((g) => ({
          id: g.id, topic: g.topic, triggerWords: g.trigger_words, approach: g.approach as Approach, familyScript: g.family_script,
          callPersonName: (g.caller as unknown as { name: string } | null)?.name ?? null,
        })),
      };
    },

    async recentTurns(householdId, since) {
      const { data } = await db.from('events').select('payload').eq('household_id', householdId).eq('type', 'conversation')
        .gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(6);
      // newest six, returned oldest first (ascending + limit kept the oldest ones in a long chat)
      return (data ?? []).reverse().map((e) => e.payload as { text: string; reply: string; mood?: string });
    },

    async takeRateToken(householdId, bucket, limit, windowSeconds) {
      const { data, error } = await db.rpc('take_rate_token', {
        p_household: householdId, p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds,
      });
      if (error) {
        console.error('takeRateToken failed', error);
        return false; // fail closed: never let a broken limiter turn into unlimited model spend
      }
      return data === true;
    },

    // Live replies: one attempt, short budget — the patient gets the calm fallback instead of a long wait.
    // If the model fails before saying a word, the backup model gets one try.
    chat: (messages, { purpose, ...opts }) => withBackup(
      purpose,
      (model) => chatText(messages, { model, timeoutMs: 15_000, maxRetries: 0, ...opts }),
      () => true,
    ),
    chatStream: (messages, { purpose, ...opts }, onDelta) => {
      let said = false;
      return withBackup(
        purpose,
        (model) => chatStream(
          messages,
          { model, timeoutMs: purpose === 'story' ? 30_000 : 15_000, firstWordsMs: FIRST_WORDS_MS, maxRetries: 0, ...opts },
          (d) => { said = true; onDelta(d); },
        ),
        () => !said,
      );
    },

    async logEvent(householdId, type, payload) {
      const { error } = await db.from('events').insert({ household_id: householdId, type, payload });
      if (error) console.error('logEvent failed', error);
    },

    alert: sendAlert,

    async faceGallery(householdId) {
      const { data } = await db.from('face_embeddings').select('person_id, embedding').eq('household_id', householdId);
      return (data ?? []).map((r) => ({ personId: r.person_id, embedding: r.embedding as number[] }));
    },
  };
}
