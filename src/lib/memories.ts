import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { chatJson, MODELS } from '@/lib/claude';
import { sendEmail, escapeHtml } from '@/lib/email';
import { buildExtractionPrompt, draftToRow, ExtractionSchema, type Turn } from '@/core/extract';
import type { CareType } from '@/core/types';

const MIN_TURNS = 2;
const MAX_TURNS = 80;

type ConversationEvent = { id: number; payload: Record<string, unknown> };

/** Reads the turns since the last pass, keeps what she told Remi, and moves the mark. Safe to call twice. */
export async function extractNewMemories(householdId: string): Promise<{ created: number }> {
  const db = supabaseAdmin();
  const { data: h, error } = await db.from('households').select('preferred_name, care_type, extracted_through').eq('id', householdId).single();
  if (error || !h) throw error ?? new Error('no household');

  const { data: events } = await db.from('events').select('id, payload').eq('household_id', householdId).eq('type', 'conversation')
    .gt('id', h.extracted_through as number).order('id').limit(MAX_TURNS);
  const turns: Turn[] = ((events ?? []) as ConversationEvent[])
    .filter((e) => typeof e.payload.text === 'string' && typeof e.payload.reply === 'string' && !e.payload.fallback)
    .map((e, i) => ({
      i, text: e.payload.text as string, reply: e.payload.reply as string, mood: e.payload.mood as string | undefined,
      recordingId: (e.payload.recordingId as string | null) ?? null, photoId: (e.payload.photoId as string | null) ?? null,
      personName: (e.payload.personName as string | null) ?? null,
    }));
  if (turns.length < MIN_TURNS) return { created: 0 };
  const through = Math.max(...(events ?? []).map((e) => e.id as number));

  const [people, questions, existing, members, lifeEvents, consent] = await Promise.all([
    db.from('people').select('id, name, relation, notes, is_deceased').eq('household_id', householdId),
    db.from('family_questions').select('id, question, asked_by').eq('household_id', householdId).in('status', ['pending', 'asked']),
    db.from('memories').select('title').eq('household_id', householdId).order('created_at', { ascending: false }).limit(60),
    db.from('household_members').select('user_id, display_name, email').eq('household_id', householdId),
    db.from('life_events').select('id, name').eq('household_id', householdId),
    db.from('consents').select('default_visibility').eq('household_id', householdId).maybeSingle(),
  ]);

  const messages = buildExtractionPrompt({
    preferredName: h.preferred_name as string, careType: (h.care_type as CareType) ?? 'elderly', turns,
    pendingQuestions: (questions.data ?? []).map((q) => ({ id: q.id, question: q.question })),
    people: (people.data ?? []).map((p) => ({ id: p.id, name: p.name, relation: p.relation, notes: p.notes, isDeceased: p.is_deceased })),
    existingTitles: (existing.data ?? []).map((m) => m.title as string),
  });
  const out = await chatJson(messages, ExtractionSchema, { model: MODELS.deep(), effort: 'high', maxTokens: 16000, timeoutMs: 180_000 });

  // a clip the tablet named but never managed to upload must not be linked
  const clipIds = [...new Set(turns.map((t) => t.recordingId).filter((x): x is string => !!x))];
  const { data: clips } = clipIds.length ? await db.from('recordings').select('id').in('id', clipIds) : { data: [] };
  const haveClip = new Set((clips ?? []).map((c) => c.id as string));
  const ctx = {
    householdId, turns: turns.map((t) => ({ ...t, recordingId: t.recordingId && haveClip.has(t.recordingId) ? t.recordingId : null })),
    members: (members.data ?? []).map((m) => ({ userId: m.user_id as string, name: (m.display_name as string | null) ?? '' })).filter((m) => m.name),
    events: (lifeEvents.data ?? []).map((e) => ({ id: e.id as string, name: e.name as string })),
    consentDefault: ((consent.data?.default_visibility as 'everyone' | 'after_death' | undefined) ?? 'everyone'),
  };

  let created = 0;
  const answered: { questionId: string; memoryId: string }[] = [];
  for (const draft of out.memories) {
    const { new_event_name, ...row } = draftToRow(draft, ctx);
    if (new_event_name) {
      const { data: ev } = await db.from('life_events').insert({ household_id: householdId, name: new_event_name }).select('id').single();
      row.open_event_id = ev?.id ?? null;
      if (ev) ctx.events.push({ id: ev.id, name: new_event_name });
    }
    const known = new Set((questions.data ?? []).map((q) => q.id as string));
    if (row.question_id && !known.has(row.question_id)) row.question_id = null;
    const { data: m, error: insErr } = await db.from('memories').insert(row).select('id').single();
    if (insErr) { console.error('memory insert failed', insErr.message); continue; }
    created++;
    if (row.question_id && m) answered.push({ questionId: row.question_id, memoryId: m.id });
  }

  for (const a of answered) {
    await db.from('family_questions').update({ status: 'answered', answered_memory_id: a.memoryId }).eq('id', a.questionId);
    const q = (questions.data ?? []).find((x) => x.id === a.questionId);
    const asker = (members.data ?? []).find((mm) => mm.user_id === q?.asked_by);
    if (asker?.email) {
      void sendEmail(asker.email as string, `${h.preferred_name} answered your question`,
        `<p>${escapeHtml(h.preferred_name as string)} told Remi about: <b>${escapeHtml(q?.question as string)}</b>.</p><p>Listen in the family portal, under Story.</p>`);
    }
  }

  await db.from('households').update({ extracted_through: through }).eq('id', householdId);
  return { created };
}
