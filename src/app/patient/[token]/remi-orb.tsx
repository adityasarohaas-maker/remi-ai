'use client';
import { useEffect, useRef } from 'react';
import { REMI_BEAT, type RemiStatus } from './use-remi';

/**
 * Remi's face: a living orb in the garden colours. It breathes while listening, swells while she
 * speaks, swirls while thinking and pulses with each word Remi says. Tapping it means "talk to me".
 */
export function RemiOrb({ status, label, onPress, size = 'md' }: {
  status: RemiStatus; label: string; onPress: () => void; size?: 'md' | 'lg';
}) {
  const core = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const onBeat = (e: Event) => {
      const kind = (e as CustomEvent<'word' | 'hear'>).detail;
      core.current?.animate(
        kind === 'word'
          ? [{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }]
          : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.08)', opacity: 0.85 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: kind === 'word' ? 260 : 420, easing: 'ease-out' },
      );
    };
    window.addEventListener(REMI_BEAT, onBeat);
    return () => window.removeEventListener(REMI_BEAT, onBeat);
  }, []);

  return (
    <button type="button" onClick={onPress} aria-label={label} data-state={status} data-size={size} className="remi-orb">
      <span className="remi-orb-breath" aria-hidden>
        <span className="remi-orb-glow" />
        <span className="remi-orb-body" />
        <span className="remi-orb-sheen" />
        <span ref={core} className="remi-orb-core" />
      </span>
    </button>
  );
}
