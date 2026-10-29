import { describe, it, expect } from 'vitest';
import { detectCareSignals, CARE_ALERTS_PER_KIND, CARE_ALERT_WINDOW_SECONDS } from '@/core/care-signals';

describe('detectCareSignals', () => {
  it('hears pain', () => { expect(detectCareSignals('my back hurts today', 'calm', 0)).toEqual(['pain']); });
  it('hears breathlessness', () => { expect(detectCareSignals("I'm so short of breath", 'calm', 0)).toEqual(['breath']); });
  it('hears a missed meal', () => { expect(detectCareSignals("I didn't eat lunch", 'calm', 0)).toEqual(['appetite']); });
  it('hears fear and distress', () => {
    expect(detectCareSignals("I'm scared tonight", 'anxious', 0)).toEqual(['fear']);
    expect(detectCareSignals("I can't take it any more", 'sad', 0)).toEqual(['distress']);
  });
  it('counts confusion that keeps coming back', () => {
    expect(detectCareSignals('where am I', 'confused', 2)).toEqual([]);
    expect(detectCareSignals('where am I', 'confused', 3)).toEqual(['confusion']);
  });
  it('stays quiet on an ordinary day', () => { expect(detectCareSignals('lovely day, the roses are out', 'happy', 0)).toEqual([]); });
  it('alerts the family at most twice per kind in six hours', () => {
    expect(CARE_ALERTS_PER_KIND).toBe(2);
    expect(CARE_ALERT_WINDOW_SECONDS).toBe(6 * 3600);
  });
});
