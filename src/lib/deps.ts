import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { chatText, chatStream, MODELS } from '@/lib/claude';
import { sendAlert } from '@/lib/alerts';
import { localParts, dayRangeUtc, safeTimeZone } from '@/core/time';
import type { CoreDeps } from '@/core/talk';
import { looksLikeReasoning } from '@/core/text';
import type { HouseholdContext, RoutineItem, Approach, CareType, LifeStage } from '@/core/types';
import { LIFE_STAGES } from '@/core/types';

// A model that hasn't started its reply by now has stalled (it happens); the backup answers instead.
const FIRST_WORDS_MS = 3500;

async function withBackup(purpose: 'story' | undefined, run: (model: string) => Promise<string>, mayRetry: () => boolean): Promise<string> {
  const model = purpose === 'story' ? MODELS.deep() : MODELS.chat();
  try {
    return await run(model);
  } catch (e) {
    const backup = MODELS.backup();
    if (!backup || backup === model || !mayRetry()) throw e;
    console.error(`chat model ${model} failed, trying ${backup}`, e);
    return run(backup);
  }
}

function storyCoverage(stages: LifeStage[]): Record<LifeStage, number> {
  const n = Object.fromEntries(LIFE_STAGES.map((s) => [s, 0])) as Record<LifeStage, number>;
  for (const s of stages) if (s in n) n[s]++;
  return n;
}

export function supabaseDeps(): CoreDeps {
  const db = supabaseAdmin();
  return {
    now: () => new Date(),

    async loadContext(householdId, now): Promise<HouseholdContext> {
      const [h, people, routine, guidance, questions, told, steered] = await Promise.all([
        db.from('households').select('*').eq('id', householdId).single(),
        db.from('people').select('id, name, relation, notes, is_deceased').eq('household_id', householdId).order('created_at'),
        db.from('routine_items').select('id, time_of_day, kind, label, spoken_message').eq('household_id', householdId).eq('active', true),
        db.from('sensitive_guidance').select('id, topic, trigger_words, approach, family_script, caller:people(name)').eq('household_id', householdId),
        db.from('family_questions').select('id, question').eq('household_id', householdId).eq('status', 'pending').order('created_at').limit(3),
        db.from('memories').select('life_stage').eq('household_id', householdId),
        db.from('events').select('created_at').eq('household_id', householdId).eq('type', 'conversation')
          .not('payload->>steer', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
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
        careType: (h.data.care_type as CareType | null) ?? 'elderly',
        pendingQuestions: (questions.data ?? []).map((q) => ({ id: q.id, question: q.question })),
        unshownPhoto: null, // the photo screen sets this on the turn itself
        storyCoverage: storyCoverage((told.data ?? []).map((m) => m.life_stage as LifeStage)),
        lastSteerAt: steered.data?.created_at ? new Date(steered.data.created_at as string) : null,
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
      async (model) => {
        const text = await chatText(messages, { model, timeoutMs: 15_000, maxRetries: 0, ...opts });
        if (looksLikeReasoning(text.slice(0, 200))) throw new Error(`${model} wrote its reasoning as the reply`);
        return text;
      },
      () => true,
    ),
    chatStream: (messages, { purpose, ...opts }, onDelta) => {
      let said = false;
      return withBackup(
        purpose,
        async (model) => {
          // the opening is held back until it can be checked: planning written as the reply never reaches her
          let opening = '';
          // and it has to come soon: a model that stalls, crawls or thinks at length gives way to the backup
          const stalled = new AbortController();
          const timer = setTimeout(() => stalled.abort(new Error(`${model}: no words in ${FIRST_WORDS_MS} ms`)), FIRST_WORDS_MS);
          const check = () => {
            if (looksLikeReasoning(opening)) throw new Error(`${model} wrote its reasoning as the reply`);
            clearTimeout(timer);
            said = true;
            onDelta(opening);
          };
          try {
            const text = await chatStream(
              messages,
              { model, timeoutMs: purpose === 'story' ? 30_000 : 15_000, signal: stalled.signal, maxRetries: 0, ...opts },
              (d) => {
                if (said) return onDelta(d);
                opening += d;
                if (opening.trim().length >= 40 || /[.!?।\n]/.test(opening.trim())) check();
              },
            );
            if (!said && opening.trim()) check();
            return text;
          } finally {
            clearTimeout(timer);
          }
        },
        () => !said,
      );
    },

    async logEvent(householdId, type, payload) {
      const { error } = await db.from('events').insert({ household_id: householdId, type, payload });
      if (error) console.error('logEvent failed', error);
    },

    alert: sendAlert,

    async setRecordVoice(householdId, on) {
      const { error } = await db.from('consents').upsert({ household_id: householdId, record_voice: on }, { onConflict: 'household_id' });
      if (error) console.error('setRecordVoice failed', error);
    },

    async logCareSignal(householdId, kind, detail) {
      const { error } = await db.from('care_signals').insert({ household_id: householdId, kind, detail: detail.slice(0, 500) });
      if (error) console.error('logCareSignal failed', error);
    },

    async markQuestionAsked(questionId) {
      const { error } = await db.from('family_questions').update({ status: 'asked', asked_at: new Date().toISOString() })
        .eq('id', questionId).eq('status', 'pending');
      if (error) console.error('markQuestionAsked failed', error);
    },

    async faceGallery(householdId) {
      const { data } = await db.from('face_embeddings').select('person_id, embedding').eq('household_id', householdId);
      return (data ?? []).map((r) => ({ personId: r.person_id, embedding: r.embedding as number[] }));
    },
  };
}
