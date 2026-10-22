# Forest: landing page and sign-in — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public landing page and the login page with the forest design: Kodi drawn in light, forming between the two halves of the name, standing in a living forest, with the page's sections on one grid; and a sign-in page in the same forest where Kodi reacts to the form.

**Architecture:** The scene (Kodi, forest, creatures) is a three.js `Points` scene built from pure, testable point-cloud builders and pure timing functions in `src/core` and `src/lib/forest`, driven by one client class `ForestScene` mounted by a `<Forest>` React component that owns the fallback image, reduced motion, WebGL detection and visibility pausing. The page itself is ordinary server-rendered Next markup on a 12-column grid; only the scene and the dock's chooser are client components. The login page mounts the same `<Forest mode="signin">` and tells it what is being typed.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs` first), React 19, Tailwind 4 with the tokens in `src/app/globals.css`, three.js 0.160 (already a dependency), `next/font` (Geist, Caveat), vitest (node environment, pure modules only), `tools/verify/shot.mjs` for screenshots.

**Spec:** `docs/superpowers/specs/2026-10-22-forest-design.md`. Reference implementation: `docs/design/prototypes/landing-and-signin.html` (open with `?mode=signin` for the sign-in page). Where this plan and the prototype differ on a visual or a timing, the prototype wins; this plan only says where the prototype's code goes and what proves it.

The family portal and the tablet are separate plans, written after this one ships.

## Global Constraints

- The product name appears only through `PRODUCT_NAME` from `src/core/brand.ts`; no literal "Remi" in new UI code.
- Fonts: Geist (300 to 600) for everything, Caveat (600) only for Kodi's speech bubble; both via `next/font`, `display: 'swap'`. Plus Jakarta Sans, Atkinson and Noto Devanagari stay for the tablet.
- Grid: 12 columns, column gap `clamp(16px, 2vw, 28px)`, max width 1240px, side padding 24px, section spacing `clamp(96px, 16vh, 180px)`; one column under 900px.
- Colours from the spec's "Palette" (dusk tokens; gold `#FFCF7A` to `#F2A93B` is the only button colour; mint `#A8F0C6`).
- Motion: `prefers-reduced-motion: reduce` means the still image and fades only; the scene never mounts.
- No WebGL (or WebGL context creation fails): the still image at the same place and size; the page is otherwise identical.
- Particle budgets: high tier about 250,000 points; low tier about 70,000 and pixel ratio capped at 1.5. Low tier when `navigator.hardwareConcurrency < 8`, or `navigator.deviceMemory < 4`, or the viewport is under 900px.
- The scene pauses when `document.hidden` and when its canvas is fully scrolled out of view.
- No new server behaviour. The demo buttons do exactly what `src/app/page.tsx` does today (`/patient/${DEMO_DEVICE_TOKEN}` link and the `startDemo` server action).
- Tests run with `npx vitest run`; lint with `npx eslint src tests`; types with `npx tsc --noEmit`. All three clean at every commit.

## Review Focus

Inputs the spec implies but no feature test exercises, most likely to bite first. Each has its test pinned to the task that owns it.

1. `DEMO_DEVICE_TOKEN` unset in production: the demo chooser must still render and offer the family portal only, never a link to `/patient/undefined`. (Task 8)
2. A visitor on a 390px phone: no horizontal page scroll at any scroll position, the dock without its links, the two opening words still on screen. (Task 8)
3. The tab is backgrounded during the opening: when it returns, the opening continues from where it was, not restarted from zero, and no frame is rendered while hidden. (Task 7)
4. WebGL context lost mid-session (GPU reset): the fallback image appears and the page stays usable; no uncaught error. (Task 7)
5. The date passes 29 October 2026: the dock's gold button becomes "Get started" and the demo chooser is gone, with no deploy. (Task 1, Task 8)

---

### Task 1: The brand constant and the demo window

**Files:**
- Create: `src/core/brand.ts`
- Test: `tests/core/brand.test.ts`

**Interfaces:**
- Produces: `PRODUCT_NAME: string` (= `'Remi'`); `DEMO_BUTTON_UNTIL: Date` (= `2026-10-30T00:00:00Z`); `demoButtonShown(now: Date): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
import { PRODUCT_NAME, demoButtonShown, DEMO_BUTTON_UNTIL } from '@/core/brand';

it('names the product once', () => { expect(PRODUCT_NAME).toBe('Remi'); });
it('shows the demo button until the hackathon is judged, then not', () => {
  expect(demoButtonShown(new Date('2026-10-22T12:00:00Z'))).toBe(true);
  expect(demoButtonShown(new Date('2026-10-29T23:59:59Z'))).toBe(true);
  expect(demoButtonShown(DEMO_BUTTON_UNTIL)).toBe(false);
});
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run tests/core/brand.test.ts` — FAIL: cannot find module.
- [ ] **Step 3: Implement `src/core/brand.ts`** with the three exports.
- [ ] **Step 4: Run it to verify it passes.**
- [ ] **Step 5: Commit** — `feat: brand constant and demo window`.

### Task 2: Seeded random and the opening's timing

**Files:**
- Create: `src/lib/seeded.ts`, `src/core/forest-motion.ts`
- Test: `tests/lib/seeded.test.ts`, `tests/core/forest-motion.test.ts`

**Interfaces:**
- Produces: `mulberry32(seed: number): () => number` (deterministic in [0, 1)).
- Produces, all pure, in `forest-motion.ts`:
  - `clamp01(x: number): number`
  - `opening(t: number): { wordIn: number; wordGone: number; formed: number; alone: number; plate: number; woods: number }` — the prototype's lines 698, 701, 707 and the plate rule (`plate = clamp01((t - 1.0) / 1.2)`), with `alone` before scroll is applied (callers multiply by `1 - scatter`).
  - `scrolled(p: number): { scatter: number; out: number; headline: number; plateFade: number; woodsDim: number }` where `p` is scrollY / viewport height: `scatter = clamp01((p - 0.15) / 0.9)`, `out = clamp01(p / 0.8)`, `headline = clamp01((p - 0.75) / 0.35) * (1 - clamp01((p - 1.6) / 0.3))`, `plateFade = 1 - clamp01(p / 0.45)`, `woodsDim = 1 - 0.6 * clamp01(p / 0.9)`.
  - `heartAmount(sectionCentreOffsetPx: number, viewportHeight: number): number` — `clamp01((1 - |offset| / (0.7 * vh)) * 1.25)` capped at 1.
  - `ease(current: number, target: number, dt: number, rate: number): number` — `current + (target - current) * (1 - exp(-dt * rate))`.
  - `signinPose(input: { typing: 'idle' | 'email' | 'password'; typedLen: number; sinceTypedS: number }): { attendTarget: 0 | 1; peekTarget: 0 | 1; yawTarget: number }` — email while `sinceTypedS < 4` attends with `yawTarget = -0.75 + min(typedLen, 30) / 30 * 0.35`; password attends with `yawTarget = 0.05` and `peekTarget = 1`; idle attends nothing (`yawTarget` irrelevant, return 0).

- [ ] **Step 1: Write the failing tests**

```ts
it('is deterministic', () => { const a = mulberry32(7), b = mulberry32(7); expect([a(), a(), a()]).toEqual([b(), b(), b()]); });

it('runs the opening in the user’s order: words in, Kodi formed, words gone, Kodi alone', () => {
  expect(opening(0)).toMatchObject({ wordIn: 0, formed: 0, wordGone: 0, alone: 0 });
  expect(opening(1.6).wordIn).toBeCloseTo(1, 2);
  expect(opening(1.6).formed).toBeLessThan(0.5);
  expect(opening(3.3).formed).toBeCloseTo(1, 2);
  expect(opening(3.3).wordGone).toBe(0);
  expect(opening(4.6)).toMatchObject({ wordGone: 1 });
  expect(opening(4.8).alone).toBe(1);
  expect(opening(2.2).plate).toBeCloseTo(1, 2);
});
it('scatters Kodi and brings the headline on scroll', () => {
  expect(scrolled(0)).toMatchObject({ scatter: 0, out: 0, headline: 0, plateFade: 1, woodsDim: 1 });
  expect(scrolled(1.05).scatter).toBeCloseTo(1, 2);
  expect(scrolled(1.1).headline).toBeCloseTo(1, 2);
  expect(scrolled(1.9).headline).toBe(0);
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
```

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement both files** with the signatures above (mulberry32 is the standard 32-bit generator).
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit** — `feat: forest timing functions and seeded random`.

### Task 3: Choosing the tier

**Files:**
- Create: `src/core/forest-tier.ts`
- Test: `tests/core/forest-tier.test.ts`

**Interfaces:**
- Produces: `type ForestTier = 'high' | 'low'`; `pickTier(d: { cores?: number; memoryGB?: number; viewportWidth: number }): ForestTier`; `type TierBudget = { kodi: number; trees: number; grass: number; fireflies: number; leaves: number; stars: number; pixelRatioCap: number; kodiScale: number }`; `TIER_BUDGET: Record<ForestTier, TierBudget>` with high = `{ kodi: 15000, trees: 12, grass: 34000, fireflies: 520, leaves: 260, stars: 2200, pixelRatioCap: 2, kodiScale: 0.8 }` and low = `{ kodi: 9000, trees: 6, grass: 9000, fireflies: 120, leaves: 80, stars: 800, pixelRatioCap: 1.5, kodiScale: 0.6 }`.

- [ ] **Step 1: Write the failing test**

```ts
it('uses the low tier on phones, small machines, or when unknown-but-small', () => {
  expect(pickTier({ cores: 12, memoryGB: 16, viewportWidth: 1440 })).toBe('high');
  expect(pickTier({ cores: 4, memoryGB: 16, viewportWidth: 1440 })).toBe('low');
  expect(pickTier({ cores: 12, memoryGB: 2, viewportWidth: 1440 })).toBe('low');
  expect(pickTier({ cores: 12, memoryGB: 16, viewportWidth: 390 })).toBe('low');
  expect(pickTier({ viewportWidth: 1440 })).toBe('high'); // browsers that report neither
});
it('keeps the low tier under the budget', () => {
  const b = TIER_BUDGET.low; expect(b.kodi + b.grass + b.fireflies + b.leaves + b.stars + b.trees * 6000).toBeLessThan(80000);
});
```

- [ ] **Step 2–5:** fail, implement, pass, commit — `feat: forest tier selection`.

### Task 4: Kodi as a point cloud

**Files:**
- Create: `src/lib/forest/cloud.ts`, `src/lib/forest/kodi-cloud.ts`
- Test: `tests/lib/forest/kodi-cloud.test.ts`

**Interfaces:**
- `cloud.ts` produces: `type Cloud = { n: number; i: number; pos: Float32Array; normal: Float32Array; color: Float32Array; size: Float32Array; seed: Float32Array; part: Float32Array; scatter: Float32Array | null; heart: Float32Array | null; intro: Float32Array | null }`; `cloud(n: number): Cloud`; `add(c: Cloud, p: number[], n: number[], col: number[], size: number, part: number, random: () => number): void`; `onEllipsoid(c: number[], surface: boolean, random: () => number): { p: number[]; n: number[] }`; the part numbers as `export const PART = { SKIN: 0, LEAF: 1, FACE: 2, ARM_L: 3, ARM_R: 4, EYE: 5, TREE: 6, GRASS: 7, FALLING_LEAF: 8, FIREFLY: 9, ANIMAL: 10, MUSHROOM: 11 } as const`. Port of prototype lines 393 to 421.
- `kodi-cloud.ts` produces: `buildKodiCloud(count: number, random: () => number): Cloud` with `scatter`, `heart` and `intro` filled. Port of prototype lines 423 to 466 (shape, colours, sizes, intro from the sides, scatter, heart offset `+2.9` on x as the spec's heart sits right of centre). `KODI_EYE = { x: 0.42, y: 0.62, rx: 0.25, ry: 0.32 }` exported for the test.

- [ ] **Step 1: Write the failing test**

```ts
const k = buildKodiCloud(15000, mulberry32(1));
it('fills the cloud with the asked count, all parts present', () => {
  expect(k.i).toBe(15000);
  const parts = new Set(Array.from(k.part)); for (const p of [0, 1, 2, 3, 4, 5]) expect(parts.has(p)).toBe(true);
});
it('keeps the eyes clear of skin points so the face reads', () => {
  for (let i = 0; i < k.i; i++) {
    if (k.part[i] !== PART.SKIN) continue;
    const x = k.pos[i * 3], y = k.pos[i * 3 + 1], z = k.pos[i * 3 + 2];
    if (z <= 0.2) continue;
    const inEye = [-KODI_EYE.x, KODI_EYE.x].some((ex) => ((x - ex) / KODI_EYE.rx) ** 2 + ((y - KODI_EYE.y) / KODI_EYE.ry) ** 2 < 1);
    expect(inEye).toBe(false);
  }
});
it('starts every point off screen at the sides, on the side it belongs to', () => {
  for (let i = 0; i < k.i; i++) expect(Math.abs(k.intro![i * 3])).toBeGreaterThanOrEqual(9);
});
it('is the same Kodi for the same seed', () => { expect(buildKodiCloud(200, mulberry32(3)).pos).toEqual(buildKodiCloud(200, mulberry32(3)).pos); });
```

- [ ] **Step 2–5:** fail, implement, pass, commit — `feat: Kodi point cloud`.

### Task 5: The forest as a point cloud

**Files:**
- Create: `src/lib/forest/forest-cloud.ts`
- Test: `tests/lib/forest/forest-cloud.test.ts`

**Interfaces:**
- Produces: `GROUND = -1.32`; `buildForestCloud(budget: TierBudget, random: () => number): { forest: Cloud; stars: Cloud; crowns: number[][] }` — trees (`roundTree`, `pineTree`, `plant` with the clearing kept open above Kodi), grass, mushrooms, flowers, falling leaves seeded from the crowns, fireflies; stars separate. Port of prototype lines 468 to 556. Tree placement uses the passed `random`, and the production seed is `TREE_SEED = 20261022` exported here.
- Produces: `buildRabbitCloud(random)` and `buildBirdClouds(random): { body: Cloud; wings: [Cloud, Cloud] }` (prototype 628 to 648).

- [ ] **Step 1: Write the failing test**

```ts
const { forest, stars, crowns } = buildForestCloud(TIER_BUDGET.high, mulberry32(TREE_SEED));
it('stays within the high budget and leaves room in the buffer', () => { expect(forest.i).toBeLessThan(260000); expect(forest.i).toBeGreaterThan(150000); expect(stars.i).toBe(2200); });
it('keeps the sky above Kodi clear of trees', () => {
  for (let i = 0; i < forest.i; i++) if (forest.part[i] === PART.TREE) { const x = forest.pos[i * 3], y = forest.pos[i * 3 + 1]; if (Math.abs(x) < 3.0 && y > GROUND + 1.5) throw new Error(`tree at ${x},${y}`); }
});
it('grows everything from the ground up', () => { for (let i = 0; i < forest.i; i++) expect(forest.pos[i * 3 + 1]).toBeGreaterThanOrEqual(GROUND - 0.05); });
it('seeds falling leaves from the crowns', () => { expect(crowns.length).toBeGreaterThan(10); });
it('fits the low budget', () => { expect(buildForestCloud(TIER_BUDGET.low, mulberry32(1)).forest.i).toBeLessThan(80000); });
```

- [ ] **Step 2–5:** fail, implement, pass, commit — `feat: forest point cloud`.

### Task 6: Fonts, tokens and the grid

**Files:**
- Modify: `src/app/layout.tsx` (add `Geist` and `Caveat` from `next/font/google` as `--font-geist` and `--font-caveat`; keep the three existing fonts)
- Modify: `src/app/globals.css` (append a `.forest` scope: the dusk tokens from the spec as `--f-sky-top`, `--f-sky-mid`, `--f-sky-low`, `--f-floor`, `--f-ink`, `--f-dim`, `--f-gold`, `--f-gold-deep`, `--f-mint`, `--f-line`, `--f-panel`; the grid variables `--f-max: 1240px`, `--f-gap`, `--f-section`; utility classes `.f-wrap`, `.f-grid`, `.f-btn` (gold), `.f-glass`, `.f-num`, `.f-title`, ported from the prototype's lines 10 to 30 and 40 to 48; a `.forest` rule setting `font-family: var(--font-geist)`; and the under-900px rules from line 147)

No unit test; the proof is the build and a screenshot in Task 8.

- [ ] **Step 1: Make the changes.**
- [ ] **Step 2: Verify** — `npx next build` passes; `npx tsc --noEmit` clean.
- [ ] **Step 3: Commit** — `feat: forest fonts, tokens and grid`.

### Task 7: The scene and its React wrapper

**Files:**
- Create: `src/app/_site/forest/shaders.ts` (the vertex and fragment shaders, prototype lines 303 to 383, verbatim)
- Create: `src/app/_site/forest/forest-scene.ts`
- Create: `src/app/_site/forest/forest.tsx`
- Create: `public/forest-still.jpg` (a 2x render of the prototype at 6.5 s with the words hidden, taken with `tools/verify/shot.mjs`, cropped to 1920×1080, under 300 KB)

**Interfaces:**
- `forest-scene.ts` produces `class ForestScene` with `constructor(canvas: HTMLCanvasElement, opts: { mode: 'landing' | 'signin'; tier: ForestTier; seed: number })`, `setScroll(p: number)`, `setHeart(amount: number)`, `setPointer(nx: number, ny: number, inside: boolean)` (normalised device coordinates), `setTyping(typing: 'idle' | 'email' | 'password', typedLen: number)`, `pause()`, `resume()`, `resize()`, `dispose()`, and `onFrame?: (f: { wordIn: number; wordGone: number; plate: number; out: number; headline: number }) => void` so the page can drive the DOM words from the same clock. It owns the clock and pauses it on `pause()` so a hidden tab resumes the opening where it stopped (Review Focus 3). Behaviour is the prototype's `frame()` (lines 693 to 798) with the timing taken from `forest-motion.ts` (Task 2) and the clouds from Tasks 4 and 5; Kodi's play, the rabbit, the birds, the wind, the cursor pull, the chest glow and the firefly friend all as in the prototype. In `signin` mode Kodi stands at x = 2.2 (0 under 860px), no heart, and `setTyping` drives `signinPose`.
- `forest.tsx` also renders, behind the canvas, what the prototype keeps outside WebGL: the sky gradient and moon (prototype CSS `.sky`, `.moon`, lines 18 to 24), the far tree line as a blurred SVG silhouette (`buildWoods`, lines 578 to 625, one layer, built once with the seeded random), and the low mist (`.mist`); these are plain DOM and show in every branch, including reduced motion and no-WebGL.
- `forest.tsx` produces `export function Forest({ mode, className, onFrame, typing, typedLen }: { mode: 'landing' | 'signin'; className?: string; onFrame?: ForestScene['onFrame']; typing?: 'idle' | 'email' | 'password'; typedLen?: number })`, a client component that: renders `<img src="/forest-still.jpg">` at the same place first; skips the scene entirely when `matchMedia('(prefers-reduced-motion: reduce)')` matches or `canvas.getContext('webgl2') ?? getContext('webgl')` is null; otherwise dynamically imports `forest-scene.ts`, picks the tier with `pickTier({ cores: navigator.hardwareConcurrency, memoryGB: (navigator as any).deviceMemory, viewportWidth: innerWidth })`, mounts the scene, swaps the image out once the first frame has rendered; pauses on `visibilitychange` and when an `IntersectionObserver` reports the canvas off screen; listens for `webglcontextlost` and shows the image again (Review Focus 4); disposes on unmount.

- [ ] **Step 1: Write the still image** — run the prototype through `tools/verify/shot.mjs` with `JS` hiding `.split, .plate, nav, .note` at 6500 ms, 1920×1080; save as `public/forest-still.jpg` (quality 80).
- [ ] **Step 2: Implement `shaders.ts`, `forest-scene.ts`, `forest.tsx`.**
- [ ] **Step 3: Verify in a test page** — temporarily add `src/app/_site/forest/dev/page.tsx` rendering `<Forest mode="landing" />` full screen; run `next dev` (stop it after) and take three screenshots with `shot.mjs` (`JS` must set `Object.defineProperty(document,'hidden',{get:()=>false})` and dispatch `visibilitychange`, as the tablet's Kodi needs): at 2000 ms (streams of light from both sides), 6500 ms (Kodi formed, forest visible, eyes clear), and after `scrollTo(0, innerHeight * 1.2)` (Kodi scattered). Compare by eye with the prototype at the same moments. Then screenshot with `?reduced=1` where the page forces the reduced-motion branch: the still image only. Delete the dev page.
- [ ] **Step 4: Verify pause** — in the dev page, run `JS` that hides the document at 1500 ms (`document.hidden` true + event) and shows it at 4500 ms, then screenshot at 6000 ms: Kodi must still be forming (opening resumed at ~3 s, not finished), not fully formed.
- [ ] **Step 5: `npx tsc --noEmit`, `npx eslint src`** clean.
- [ ] **Step 6: Commit** — `feat: forest scene and wrapper`.

### Task 8: The landing page

**Files:**
- Modify: `src/app/page.tsx` (rewrite)
- Create: `src/app/_site/dock.tsx` (server component: brand, three section links, Sign in, and either the demo button or Get started by `demoButtonShown(new Date())`), `src/app/_site/demo-chooser.tsx` (client: the gold "Try the demo" button that opens a glass chooser with "Avni's tablet" as a link to `/patient/${token}` only when `token` is given, and "The family portal" as a form with `startDemo`), `src/app/_site/opening.tsx` (client: the two words, plate and headline, driven by `Forest`'s `onFrame`), `src/app/_site/sections.tsx` (server: sections 01 to 05 and the footer, markup and copy ported from the prototype: nav at lines 184 to 188, main 189 to 265, footer 266 to 272, with `PRODUCT_NAME` and the dock reduced to the three section links the spec names)
- Test: `tests/core/brand.test.ts` (extend), and a DOM-free unit test for the chooser's link rule: create `src/core/demo-links.ts` with `demoLinks(token: string | undefined): { tablet: string | null; portal: true }` and `tests/core/demo-links.test.ts`.

**Interfaces:**
- Consumes: `Forest`, `PRODUCT_NAME`, `demoButtonShown`, `startDemo` (unchanged, `src/app/demo-actions.ts`), `process.env.DEMO_DEVICE_TOKEN` read in the server component and passed down as a prop.
- Produces: the page at `/`.

- [ ] **Step 1: Write the failing test**

```ts
it('never links to a tablet it does not have', () => {
  expect(demoLinks(undefined)).toEqual({ tablet: null, portal: true });
  expect(demoLinks('abc')).toEqual({ tablet: '/patient/abc', portal: true });
});
```

- [ ] **Step 2: Run to verify it fails; implement `demo-links.ts`; verify it passes.**
- [ ] **Step 3: Build the page** — `page.tsx` renders `<main className="forest">` with `<Dock>`, `<Forest mode="landing" onFrame>` fixed behind, `<Opening>` and `<Sections>`; the words, plate and headline are real DOM text with opacity driven by `onFrame` (never `display: none`); section ids `how`, `places`, `safety` for the dock's anchors; the footer's small print includes the Nemotron credit from the spec.
- [ ] **Step 4: Verify** — `next dev`; screenshots with `shot.mjs` at 1440×900: 6500 ms (words and plate under Kodi), `scrollTo(0, innerHeight*1.25)` (headline left, facts right), each of `.film`, `.how`, `.heart` (+35vh), `.screens`, the bottom of the page. Then at 390×844: 6500 ms and the bottom; the result JSON must report `"horizontalOverflow":false` for both (Review Focus 2). Then `DEMO_DEVICE_TOKEN=` unset: the chooser shows only "The family portal" (Review Focus 1). Review Focus 5 (the button changing after 29 October) is proven by Task 1's test; the dock must call `demoButtonShown(new Date())` at render, not at module load.
- [ ] **Step 5: `npx vitest run`, `npx tsc --noEmit`, `npx eslint src tests`** clean. Stop the dev server.
- [ ] **Step 6: Commit** — `feat: forest landing page`.

### Task 9: Sign-in in the forest

**Files:**
- Modify: `src/app/login/page.tsx` (rewrite as the glass card over `<Forest mode="signin">`; keep the exact Supabase calls, modes, error display, `router.push('/family')` and `router.refresh()`; add `?mode=create` to open in create mode; the card copy from the spec; the "I'm not looking!" bubble in Caveat; `typing` and `typedLen` state from the inputs' focus/input/blur passed to `<Forest>`)
- Modify: `src/app/_site/dock.tsx` ("Get started" links to `/login?mode=create`), `src/app/_site/sections.tsx` (section 05 button likewise)
- Test: `tests/core/forest-motion.test.ts` already covers `signinPose`; no new unit test.

- [ ] **Step 1: Build the page.**
- [ ] **Step 2: Verify** — `next dev`; `shot.mjs` on `/login` at 1440×860: idle at 7000 ms (Kodi right of centre, card left, no words); with `JS` focusing `#email` and typing `priya@exa` at 6000 ms, screenshot at 9000 ms (Kodi turned towards the card); with `JS` focusing `#password` and typing at 6000 ms, screenshot at 10000 ms (leaves over the eyes, bubble visible). Then `/login?mode=create` shows "Create your family account" and the "Create account" button. Then 390×844 idle: card at the bottom, Kodi centred above it, no horizontal overflow.
- [ ] **Step 3: Sign in with the demo account in the browser** (`DEMO_EMAIL` / `DEMO_PASSWORD` from `.env.local`, typed by the person running the plan, never by an agent) and confirm it lands on `/family`.
- [ ] **Step 4: `npx vitest run`, `npx tsc --noEmit`, `npx eslint src tests`** clean. Stop the dev server.
- [ ] **Step 5: Commit** — `feat: sign-in in the forest`.

### Task 10: Ship

**Files:** none new.

- [ ] **Step 1: `npx next build`** clean; note the First Load JS of `/`: the scene must be in its own chunk (dynamic import), so `/` without it stays under 150 kB.
- [ ] **Step 2: Deploy** — `vercel deploy --prod --yes`; open the production URL on a laptop and a phone; watch the opening through once on each; try the demo chooser; sign in.
- [ ] **Step 3: Commit anything the deploy needed and push** — `git push origin main`.
