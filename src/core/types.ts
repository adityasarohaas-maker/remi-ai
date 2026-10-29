export interface Household {
  id: string; patientName: string; preferredName: string; language: string; timezone: string;
  about: string | null; homeAddress: string | null;
  primaryContactName: string | null; primaryContactPhone: string | null;
}
export interface Person { id: string; name: string; relation: string; notes: string | null; isDeceased: boolean }
export interface RoutineItem { id: string; timeOfDay: string; kind: 'medicine' | 'meal' | 'activity'; label: string; spokenMessage: string | null }
export type Approach = 'redirect' | 'share_memory' | 'call_relative';
export interface Guidance { id: string; topic: string; triggerWords: string[]; approach: Approach; familyScript: string; callPersonName: string | null }
export interface HouseholdContext {
  household: Household; people: Person[]; routine: RoutineItem[];
  doneIds: string[]; guidance: Guidance[];
  careType: CareType;
  pendingQuestions: { id: string; question: string }[];
  unshownPhoto: { id: string; note: string | null } | null;
  storyCoverage: Record<LifeStage, number>;
  lastSteerAt: Date | null;
}

// --- keeping a life ---
export const LIFE_STAGES = ['childhood', 'youth', 'marriage', 'work', 'parenthood', 'later', 'other', 'wishes'] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];
export const VISIBILITIES = ['everyone', 'members', 'after_death', 'on_date', 'on_event', 'remi_only'] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export type MemoryKind = 'story' | 'lesson' | 'recipe' | 'wish' | 'letter';
export type CareType = 'elderly' | 'dementia' | 'terminal';
export type HouseholdStatus = 'living' | 'passed';

/** The fields that decide who may see a memory, and when. */
export interface MemoryRule {
  visibility: Visibility;
  visibleTo: string[];
  openOn: string | null;      // YYYY-MM-DD
  openEventId: string | null;
}

export interface Memory extends MemoryRule {
  id: string; householdId: string;
  title: string; summary: string; quote: string; language: string; translation: string | null;
  recordingId: string | null; clipStartMs: number | null; clipEndMs: number | null;
  lifeStage: LifeStage; yearFrom: number | null; yearTo: number | null;
  people: string[]; places: string[]; kind: MemoryKind;
  confidence: 'sure' | 'unsure'; verifiedBy: string | null;
  recipientName: string | null; recipientEmail: string | null; openedAt: string | null;
  questionId: string | null; photoId: string | null; createdAt: string;
}
