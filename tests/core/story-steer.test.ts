import { describe, it, expect } from 'vitest';
import { pickSteer, STEER_GAP_MINUTES } from '@/core/story-steer';
import type { SteerInput } from '@/core/story-steer';

const base: SteerInput = {
  careType: 'elderly', pendingQuestions: [], unshownPhoto: null,
  storyCoverage: { childhood: 0, youth: 0, marriage: 0, work: 0, parenthood: 0, later: 0, other: 0, wishes: 0 },
  minutesSinceLastSteer: 60,
};

describe('pickSteer', () => {
  it('asks a pending family question first', () => {
    expect(pickSteer({ ...base, pendingQuestions: [{ id: 'q1', question: 'Ask Papa about 1971' }] }))
      .toEqual({ kind: 'question', id: 'q1', text: 'Ask Papa about 1971' });
  });
  it('then an unshown photo', () => {
    expect(pickSteer({ ...base, unshownPhoto: { id: 'ph1', note: 'Wedding, 1968' } })).toEqual({ kind: 'photo', id: 'ph1', note: 'Wedding, 1968' });
  });
  it('starts with childhood for someone living with dementia', () => {
    expect(pickSteer({ ...base, careType: 'dementia' })).toEqual({ kind: 'stage', stage: 'childhood' });
  });
  it('picks the least-told part of her life otherwise', () => {
    expect(pickSteer({ ...base, storyCoverage: { ...base.storyCoverage, childhood: 3, youth: 2, marriage: 1, work: 4, parenthood: 2, later: 2 } }))
      .toEqual({ kind: 'stage', stage: 'marriage' });
  });
  it('never steers toward wishes on its own', () => {
    const covered = { childhood: 5, youth: 5, marriage: 5, work: 5, parenthood: 5, later: 5, other: 5, wishes: 0 };
    expect(pickSteer({ ...base, storyCoverage: covered })).not.toEqual({ kind: 'stage', stage: 'wishes' });
  });
  it('stays quiet when Remi steered a little while ago', () => {
    expect(STEER_GAP_MINUTES).toBe(20);
    expect(pickSteer({ ...base, minutesSinceLastSteer: 5, pendingQuestions: [{ id: 'q1', question: 'x' }] })).toBeNull();
  });
});
