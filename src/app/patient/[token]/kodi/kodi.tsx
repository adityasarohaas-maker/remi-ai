'use client';
import { useEffect, useRef, useState } from 'react';
import type { KodiCue, KodiEmotion } from '@/core/kodi';
import { REMI_BEAT } from '../use-remi';
import type { KodiScene, KodiState } from './kodi-scene';

/**
 * Kodi on the tablet. The heavy three.js scene loads only in the browser; if WebGL is missing,
 * a still drawing of Kodi stands in. Tapping Kodi means "talk to me".
 */
export function Kodi({ state, emotion, cue, night, label, onPress, className = '' }: {
  state: KodiState; emotion: KodiEmotion; cue: KodiCue; night: boolean; label: string; onPress?: () => void; className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<KodiScene | null>(null);
  const [fallback, setFallback] = useState(false);
  const latest = useRef({ state, emotion, night });
  useEffect(() => { latest.current = { state, emotion, night }; });

  useEffect(() => {
    let cancelled = false;
    import('./kodi-scene').then(({ KodiScene }) => {
      if (cancelled || !canvas.current) return;
      try {
        const small = Math.min(window.innerWidth, window.innerHeight) < 600 || (navigator.hardwareConcurrency ?? 8) <= 4;
        const s = new KodiScene(canvas.current, {
          night: latest.current.night,
          density: small ? 0.55 : 1,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        });
        s.setState(latest.current.state);
        s.setEmotion(latest.current.emotion);
        scene.current = s;
      } catch {
        setFallback(true); // no WebGL on this device
      }
    }).catch(() => setFallback(true));
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, []);

  useEffect(() => { scene.current?.setState(state); }, [state]);
  useEffect(() => { scene.current?.setEmotion(emotion); }, [emotion]);
  useEffect(() => { scene.current?.setNight(night); }, [night]);
  useEffect(() => { if (cue) scene.current?.play(cue.gesture); }, [cue]);
  useEffect(() => {
    const onBeat = (e: Event) => { if ((e as CustomEvent).detail === 'word') scene.current?.wordBeat(); };
    window.addEventListener(REMI_BEAT, onBeat);
    return () => window.removeEventListener(REMI_BEAT, onBeat);
  }, []);

  const body = fallback ? <KodiStill /> : <canvas ref={canvas} className="block h-full w-full" aria-hidden />;
  return onPress ? (
    <button type="button" onClick={onPress} aria-label={label} className={`kodi block cursor-pointer ${className}`}>{body}</button>
  ) : (
    <div role="img" aria-label={label} className={`kodi ${className}`}>{body}</div>
  );
}

/** Kodi as a plain drawing, for devices without WebGL. */
function KodiStill() {
  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-full max-h-[22rem] w-auto" aria-hidden>
      <ellipse cx="100" cy="184" rx="44" ry="7" fill="#7FBF9A" opacity=".35" />
      <ellipse cx="82" cy="176" rx="12" ry="8" fill="#F4F7F1" /><ellipse cx="118" cy="176" rx="12" ry="8" fill="#F4F7F1" />
      <ellipse cx="100" cy="146" rx="34" ry="32" fill="#FBFDF8" stroke="#E2EDDF" strokeWidth="3" />
      <ellipse cx="100" cy="94" rx="50" ry="46" fill="#FBFDF8" stroke="#E2EDDF" strokeWidth="3" />
      <path d="M100 50 C100 40 102 32 106 26" stroke="#5DA275" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M106 30 C120 14 142 18 146 26 C134 40 116 40 106 30Z" fill="#86CC98" /><path d="M102 34 C88 20 66 24 62 32 C74 44 92 44 102 34Z" fill="#A2DCAF" />
      <ellipse cx="82" cy="96" rx="10" ry="13" fill="#24331F" /><ellipse cx="118" cy="96" rx="10" ry="13" fill="#24331F" />
      <circle cx="85" cy="91" r="4.2" fill="#fff" /><circle cx="121" cy="91" r="4.2" fill="#fff" />
      <ellipse cx="66" cy="114" rx="9" ry="5.5" fill="#F7A8C4" opacity=".7" /><ellipse cx="134" cy="114" rx="9" ry="5.5" fill="#F7A8C4" opacity=".7" />
      <ellipse cx="100" cy="116" rx="6" ry="5" fill="#24331F" />
    </svg>
  );
}
