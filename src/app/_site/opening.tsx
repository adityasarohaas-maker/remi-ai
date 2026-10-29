'use client';
import { useCallback, useRef } from 'react';
import { PRODUCT_NAME } from '@/core/brand';
import { Forest } from './forest/forest';
import type { FrameInfo } from './forest/forest-scene';

/**
 * The opening: the two halves of the name come in from the sides, Kodi forms between them, the words go,
 * then on scroll he scatters and the headline arrives. Real text, driven by the scene's own clock.
 */
export function Opening() {
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const headline = useRef<HTMLDivElement>(null);

  const onFrame = useCallback((f: FrameInfo) => {
    const fromEdge = (1 - f.wordIn) * window.innerWidth * 0.5;
    const vis = String(f.wordIn * (1 - f.out));
    if (left.current) { left.current.style.transform = `translate(${-fromEdge - f.out * 60}px, -50%)`; left.current.style.opacity = vis; }
    if (right.current) { right.current.style.transform = `translate(${fromEdge + f.out * 60}px, -50%)`; right.current.style.opacity = vis; }
    if (plate.current) plate.current.style.opacity = String(f.plate);
    if (hint.current) hint.current.style.opacity = String(f.hint);
    if (headline.current) { headline.current.style.opacity = String(f.headline); headline.current.style.transform = `translateY(calc(-50% + ${(1 - f.headline) * 18}px))`; }
  }, []);

  return (
    <>
      <Forest mode="landing" onFrame={onFrame} />
      <div className="f-hero"><div className="f-hero-sticky">
        <div ref={left} className="f-split left">{PRODUCT_NAME}</div>
        <div ref={right} className="f-split right">keeps a life</div>
        <div ref={plate} className="f-plate">
          <span className="f-who">Their voice, their stories, for the people who love them.</span>
          <span ref={hint} className="f-hint"><i />Scroll to meet {PRODUCT_NAME}</span>
        </div>
        <div ref={headline} className="f-headline"><div className="f-grid">
          <div className="f-h-main">
            <h1>Everything only they knew, kept in their own voice</h1>
            <p>{PRODUCT_NAME} sits beside someone in the last chapter of their life, talks with them every day, and keeps what they tell it, in their own words, for now and for after. Nothing is ever invented.</p>
          </div>
          <ul className="f-facts">
            <li><b>Their own voice</b><span>every story kept as they told it</span></li>
            <li><b>Ask anything</b><span>and hear only what they really said</span></li>
            <li><b>Yours to keep</b><span>every clip, every word, any time</span></li>
          </ul>
        </div></div>
      </div></div>
    </>
  );
}
