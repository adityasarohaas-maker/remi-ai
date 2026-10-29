import { describe, it, expect } from 'vitest';
import { opening, scrolled, heartAmount, ease, signinPose, clamp01 } from '@/core/forest-motion';

describe('forest motion', () => {
  it('clamps', () => { expect(clamp01(-1)).toBe(0); expect(clamp01(2)).toBe(1); expect(clamp01(0.3)).toBe(0.3); });
  it("runs the opening in the user's order: words in, Kodi formed, words gone, Kodi alone", () => {
    expect(opening(0)).toMatchObject({ wordIn: 0, formed: 0, wordGone: 0, alone: 0 });
    expect(opening(1.6).wordIn).toBeCloseTo(1, 2);
    expect(opening(1.6).formed).toBeLessThan(0.5);
    expect(opening(3.3).formed).toBeCloseTo(1, 2);
    expect(opening(3.3).wordGone).toBe(0);
    expect(opening(4.6).wordGone).toBeCloseTo(1, 6);
    expect(opening(4.8).alone).toBeCloseTo(1, 6);
    expect(opening(2.2).plate).toBeCloseTo(1, 2);
  });
  it('scatters Kodi and brings the headline on scroll', () => {
    expect(scrolled(0)).toMatchObject({ scatter: 0, out: 0, headline: 0, plateFade: 1, woodsDim: 1 });
    expect(scrolled(1.05).scatter).toBeCloseTo(1, 2);
    expect(scrolled(1.1).headline).toBeCloseTo(1, 2);
    expect(scrolled(1.9).headline).toBeCloseTo(0, 6);
  });
  it('forms the heart only while its section is centred', () => {
    expect(heartAmount(0, 900)).toBe(1);
    expect(heartAmount(900, 900)).toBe(0);
  });
  it('eases by time, not by frame', () => {
    const a = ease(0, 1, 0.016, 5), b = ease(0, 1, 0.032, 5);
    expect(b).toBeGreaterThan(a); expect(ease(0, 1, 10, 5)).toBeCloseTo(1, 3);
  });
  it('watches the email, hides from the password, rests when idle', () => {
    expect(signinPose({ typing: 'email', typedLen: 0, sinceTypedS: 0 })).toMatchObject({ attendTarget: 1, peekTarget: 0, yawTarget: -0.75 });
    expect(signinPose({ typing: 'email', typedLen: 30, sinceTypedS: 0 }).yawTarget).toBeCloseTo(-0.4);
    expect(signinPose({ typing: 'email', typedLen: 5, sinceTypedS: 5 }).attendTarget).toBe(0);
    expect(signinPose({ typing: 'password', typedLen: 0, sinceTypedS: 0 })).toMatchObject({ attendTarget: 1, peekTarget: 1, yawTarget: 0.05 });
    expect(signinPose({ typing: 'idle', typedLen: 0, sinceTypedS: 0 })).toMatchObject({ attendTarget: 0, peekTarget: 0 });
  });
});
