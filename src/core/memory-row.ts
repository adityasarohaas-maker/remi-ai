import type { Memory } from './types';

/** A `memories` row as the database returns it. */
export interface MemoryDbRow {
  id: string; household_id: string; title: string; summary: string; quote: string; language: string; translation: string | null;
  recording_id: string | null; clip_start_ms: number | null; clip_end_ms: number | null;
  life_stage: Memory['lifeStage']; year_from: number | null; year_to: number | null;
  people: string[]; places: string[]; kind: Memory['kind']; confidence: Memory['confidence']; verified_by: string | null;
  visibility: Memory['visibility']; visible_to: string[]; recipient_name: string | null; recipient_email: string | null;
  open_on: string | null; open_event_id: string | null; opened_at: string | null;
  question_id: string | null; photo_id: string | null; created_at: string;
}

export const MEMORY_COLUMNS = 'id, household_id, title, summary, quote, language, translation, recording_id, clip_start_ms, clip_end_ms, life_stage, year_from, year_to, people, places, kind, confidence, verified_by, visibility, visible_to, recipient_name, recipient_email, open_on, open_event_id, opened_at, question_id, photo_id, created_at';

export function memoryFromRow(r: MemoryDbRow): Memory {
  return {
    id: r.id, householdId: r.household_id, title: r.title, summary: r.summary, quote: r.quote, language: r.language, translation: r.translation,
    recordingId: r.recording_id, clipStartMs: r.clip_start_ms, clipEndMs: r.clip_end_ms,
    lifeStage: r.life_stage, yearFrom: r.year_from, yearTo: r.year_to, people: r.people ?? [], places: r.places ?? [],
    kind: r.kind, confidence: r.confidence, verifiedBy: r.verified_by,
    visibility: r.visibility, visibleTo: r.visible_to ?? [], recipientName: r.recipient_name, recipientEmail: r.recipient_email,
    openOn: r.open_on, openEventId: r.open_event_id, openedAt: r.opened_at,
    questionId: r.question_id, photoId: r.photo_id, createdAt: r.created_at,
  };
}
