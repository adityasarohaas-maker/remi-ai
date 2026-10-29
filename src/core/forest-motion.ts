// The forest's clocks: when the words arrive, when Kodi forms, what scrolling does. Pure, so they can be proved.

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** The opening, by seconds since the scene started. `alone` is before scroll; callers multiply by (1 - scatter). */
export function opening(t: number) {
  const wordIn = 1 - Math.pow(1 - clamp01((t - 0.15) / 1.4), 3);
  const wordGone = clamp01((t - 3.6) / 1.0);
  const formed = clamp01((t - 0.3) / 3.0);
  const alone = clamp01((t - 4.0) / 0.8);
  const plate = clamp01((t - 1.0) / 1.2);
  const woods = clamp01((t - 0.6) / 2.4);
  return { wordIn, wordGone, formed, alone, plate, woods };
}

/** What scrolling does, by scrollY / viewport height. */
export function scrolled(p: number) {
  return {
    scatter: clamp01((p - 0.15) / 0.9),
    out: clamp01(p / 0.8),
    headline: clamp01((p - 0.75) / 0.35) * (1 - clamp01((p - 1.6) / 0.3)),
    plateFade: 1 - clamp01(p / 0.45),
    woodsDim: 1 - 0.6 * clamp01(p / 0.9),
  };
}

/** How much of the heart to show: full only while its section's centre is near the screen's centre. */
export function heartAmount(sectionCentreOffsetPx: number, viewportHeight: number): number {
  return Math.min(1, clamp01((1 - Math.abs(sectionCentreOffsetPx) / (0.7 * viewportHeight)) * 1.25));
}

/** Eased by time, not by frame, so a slow tablet takes the same moment as a fast laptop. */
export function ease(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-dt * rate));
}

export type Typing = 'idle' | 'email' | 'password';

/** Where Kodi looks on the sign-in page: watches the email being typed, hides from the password. */
export function signinPose(i: { typing: Typing; typedLen: number; sinceTypedS: number }): { attendTarget: 0 | 1; peekTarget: 0 | 1; yawTarget: number } {
  if (i.typing === 'password') return { attendTarget: 1, peekTarget: 1, yawTarget: 0.05 };
  if (i.typing === 'email' && i.sinceTypedS < 4) {
    return { attendTarget: 1, peekTarget: 0, yawTarget: -0.75 + (Math.min(i.typedLen, 30) / 30) * 0.35 };
  }
  return { attendTarget: 0, peekTarget: 0, yawTarget: 0 };
}
