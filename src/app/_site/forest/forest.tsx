'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { pickTier } from '@/core/forest-tier';
import { heartAmount, type Typing } from '@/core/forest-motion';
import type { FrameInfo, ForestMode, ForestScene } from './forest-scene';
import { woodsSvg } from './woods';

const WOODS_SEED = 20261022;

/**
 * The forest behind a page. The sky, moon, far tree line and mist are plain DOM and show everywhere;
 * the living scene (Kodi, trees, creatures) is WebGL, skipped for reduced motion or no WebGL, where the still stays.
 */
export function Forest({ mode, className, onFrame, typing = 'idle', typedLen = 0 }: {
  mode: ForestMode; className?: string; onFrame?: (f: FrameInfo) => void; typing?: Typing; typedLen?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const woodsEl = useRef<SVGSVGElement>(null);
  const scene = useRef<ForestScene | null>(null);
  const frameCb = useRef(onFrame);
  useEffect(() => { frameCb.current = onFrame; }, [onFrame]);
  const [live, setLive] = useState(false);   // the scene has drawn its first frame: the still can go
  const [lost, setLost] = useState(false);   // the GPU went away: the still comes back
  const woods = useMemo(() => woodsSvg(WOODS_SEED), []);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).get('reduced') === '1') return;
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') ?? probe.getContext('webgl'))) return;

    let cancelled = false;
    let s: ForestScene | null = null;
    let onScreen = true, hidden = document.hidden;
    const heartEl = () => document.querySelector<HTMLElement>('[data-forest-heart]');
    const sync = () => { if (!s) return; if (hidden || !onScreen) s.pause(); else s.resume(); };

    import('./forest-scene').then(({ ForestScene: Scene }) => {
      if (cancelled) return;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const tier = pickTier({ cores: nav.hardwareConcurrency, memoryGB: nav.deviceMemory, viewportWidth: window.innerWidth });
      try {
        s = new Scene(el, { mode, tier, seed: 7, woods: woodsEl.current });
      } catch (e) {
        console.error('forest could not start', e);
        return;
      }
      scene.current = s;
      let first = true;
      s.onFrame = (f) => {
        if (first) { first = false; setLive(true); }
        const h = heartEl();
        if (h) { const r = h.getBoundingClientRect(); s!.setHeart(heartAmount(r.top + r.height / 2 - window.innerHeight / 2, window.innerHeight)); }
        frameCb.current?.(f);
      };
      s.setScroll(window.scrollY / window.innerHeight);
      sync();
    });

    const onScroll = () => s?.setScroll(window.scrollY / window.innerHeight);
    const onResize = () => s?.resize();
    const onMove = (e: PointerEvent) => s?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, true);
    const onLeave = () => s?.setPointer(0, 0, false);
    const onVisibility = () => { hidden = document.hidden; sync(); };
    const onLost = (e: Event) => { e.preventDefault(); setLost(true); s?.pause(); };
    const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); }, { threshold: 0 });
    io.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    el.addEventListener('webglcontextlost', onLost);
    return () => {
      cancelled = true;
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      el.removeEventListener('webglcontextlost', onLost);
      s?.dispose();
      scene.current = null;
    };
  }, [mode]);

  useEffect(() => { scene.current?.setTyping(typing, typedLen); }, [typing, typedLen]);

  const showStill = !live || lost;
  return (
    <div className={`f-stage ${className ?? ''}`} aria-hidden>
      <div className="f-sky" />
      <div className="f-moon" />
      <div className="f-woods"><svg ref={woodsEl} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" style={{ opacity: live && !lost ? undefined : 1 }} dangerouslySetInnerHTML={{ __html: woods }} /></div>
      {/* eslint-disable-next-line @next/next/no-img-element -- a plain still, swapped for the live scene */}
      <img src="/forest-still.jpg" alt="" className="f-still" style={{ opacity: showStill ? 1 : 0 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      <canvas ref={canvas} className="f-canvas" style={{ opacity: live && !lost ? 1 : 0 }} />
      <div className="f-mist" />
    </div>
  );
}
