// What Remi gently brings up, when the conversation has room for it: a question from the family,
// a photo they added, or a part of her life she hasn't told yet. Never more than one, never often.
import type { CareType, LifeStage } from './types';

export const STEER_GAP_MINUTES = 20;

export type Steer =
  | { kind: 'question'; id: string; text: string }
  | { kind: 'photo'; id: string; note: string | null }
  | { kind: 'stage'; stage: Exclude<LifeStage, 'wishes'> };

export interface SteerInput {
  careType: CareType;
  pendingQuestions: { id: string; question: string }[];
  unshownPhoto: { id: string; note: string | null } | null;
  storyCoverage: Record<LifeStage, number>;
  minutesSinceLastSteer: number;
}

// Memory fades newest-first: for dementia the earliest chapters are kept before anything else.
const DEMENTIA_FIRST: Exclude<LifeStage, 'wishes'>[] = ['childhood', 'youth', 'marriage'];
// 'other' is where stray stories land, not a chapter to open; 'wishes' only ever comes from her.
const STAGES: Exclude<LifeStage, 'wishes' | 'other'>[] = ['childhood', 'youth', 'marriage', 'work', 'parenthood', 'later'];

export function pickSteer(i: SteerInput): Steer | null {
  if (i.minutesSinceLastSteer < STEER_GAP_MINUTES) return null;
  const q = i.pendingQuestions[0];
  if (q) return { kind: 'question', id: q.id, text: q.question };
  if (i.unshownPhoto) return { kind: 'photo', id: i.unshownPhoto.id, note: i.unshownPhoto.note };
  if (i.careType === 'dementia') {
    const early = DEMENTIA_FIRST.find((s) => (i.storyCoverage[s] ?? 0) === 0);
    if (early) return { kind: 'stage', stage: early };
  }
  const least = STAGES.reduce((best, s) => ((i.storyCoverage[s] ?? 0) < (i.storyCoverage[best] ?? 0) ? s : best), STAGES[0]);
  return { kind: 'stage', stage: least };
}

/** How Remi might open each chapter, for the prompt. */
export const STAGE_HINT: Record<Exclude<LifeStage, 'wishes'>, string> = {
  childhood: 'where she grew up, her parents, the house, school, games, festivals',
  youth: 'being young: friends, studies, first job, music, the town',
  marriage: 'how she met her husband, the wedding, early married life',
  work: 'her work and what she was proud of',
  parenthood: 'raising her children, family life, holidays',
  later: 'the last twenty years: grandchildren, travels, hobbies, what she has learned',
  other: 'anything she loves to talk about',
};
