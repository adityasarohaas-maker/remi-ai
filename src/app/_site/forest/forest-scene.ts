// The forest, alive: Kodi forming from light, the trees growing in, a rabbit, birds, the wind.
// A port of the prototype's frame() with the timing from core/forest-motion and the clouds from lib/forest.
import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders';
import { mulberry32 } from '@/lib/seeded';
import { type Cloud } from '@/lib/forest/cloud';
import { buildKodiCloud } from '@/lib/forest/kodi-cloud';
import { buildForestCloud, buildRabbitCloud, buildBirdClouds, GROUND, TREE_SEED } from '@/lib/forest/forest-cloud';
import { TIER_BUDGET, type ForestTier } from '@/core/forest-tier';
import { opening, scrolled, ease, clamp01, signinPose, type Typing } from '@/core/forest-motion';

export type ForestMode = 'landing' | 'signin';
export type FrameInfo = { wordIn: number; wordGone: number; plate: number; out: number; headline: number; woods: number; hint: number };

const ACTS = { wave: 2.6, hop: 1.0, hops: 2.0, twirl: 1.6, play: 4.2, look: 2.4 } as const;
type ActName = keyof typeof ACTS | 'none';
const smooth = (x: number) => x * x * (3 - 2 * x);

function toPoints(c: Cloud, mat: THREE.Material): THREE.Points {
  const g = new THREE.BufferGeometry(), n = c.i;
  const sub = (a: Float32Array, k: number) => a.subarray(0, n * k);
  g.setAttribute('position', new THREE.BufferAttribute(sub(c.pos, 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(sub(c.normal, 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(sub(c.color, 3), 3));
  for (const k of ['scatter', 'heart', 'intro'] as const) g.setAttribute(k, new THREE.BufferAttribute(c[k] ? sub(c[k]!, 3) : sub(c.pos, 3), 3));
  g.setAttribute('size', new THREE.BufferAttribute(sub(c.size, 1), 1));
  g.setAttribute('seed', new THREE.BufferAttribute(sub(c.seed, 1), 1));
  g.setAttribute('part', new THREE.BufferAttribute(sub(c.part, 1), 1));
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}

function glowTexture(inner: string, mid: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!, grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(0.25, mid); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export class ForestScene {
  onFrame?: (f: FrameInfo) => void;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  private shared: Record<string, THREE.IUniform>;
  private kodi: THREE.Points; private forest: THREE.Points; private sky: THREE.Points; private rabbit: THREE.Points;
  private birds: { g: THREE.Group; wings: [THREE.Points, THREE.Points] }[];
  private kodiMat: THREE.ShaderMaterial; private forestMat: THREE.ShaderMaterial; private skyMat: THREE.ShaderMaterial; private critterMat: THREE.ShaderMaterial;
  private glow: THREE.Sprite; private buddy: THREE.Sprite;
  private random: () => number;
  private kscale: number;
  private readonly mode: ForestMode;
  private readonly tierScale: number;
  private woods: SVGElement | null;

  // the clock: only runs while the scene is on screen, so a hidden tab resumes the opening where it left off
  private elapsed = 0; private lastNow: number | null = null; private raf = 0; private running = false; private disposed = false;
  // inputs
  private scrollP = 0; private heartTarget = 0;
  private mouseTarget = new THREE.Vector3(99, 99, 0); private mouseIn = false; private mouseX = 0;
  private typing: Typing = 'idle'; private typedAt = -99; private typedLen = 0;
  // eased state
  private sScatter = 0; private sHeart = 0; private hover = 0; private yaw = 0; private attend = 0; private peek = 0; private lastT = 0;
  private act: { name: ActName; start: number; dur: number } = { name: 'none', start: 0, dur: 0 };
  private nextAt = 4.6; private lastAct = ''; private blinkAt = 5;

  constructor(canvas: HTMLCanvasElement, opts: { mode: ForestMode; tier: ForestTier; seed: number; woods?: SVGElement | null }) {
    this.mode = opts.mode;
    this.woods = opts.woods ?? null;
    const budget = TIER_BUDGET[opts.tier];
    this.tierScale = budget.kodiScale;
    this.kscale = budget.kodiScale;
    this.random = mulberry32(opts.seed);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, budget.pixelRatioCap));
    this.camera.position.set(0, 0.35, 9);

    this.shared = {
      uTime: { value: 0 }, uScatter: { value: 0 }, uHeart: { value: 0 }, uIntro: { value: 0 }, uPx: { value: this.renderer.getPixelRatio() },
      uMouse: { value: new THREE.Vector3(99, 99, 0) }, uHover: { value: 0 }, uArmL: { value: 0 }, uArmR: { value: 0 }, uBlink: { value: 1 },
      uWind: { value: 1 }, uPeek: { value: 0 },
    };
    const material = (o: { kodi: boolean; drift: number; fade?: number; size?: number }) => new THREE.ShaderMaterial({
      uniforms: { ...this.shared, uKodi: { value: o.kodi ? 1 : 0 }, uDrift: { value: o.drift }, uFade: { value: o.fade ?? 1 }, uSize: { value: o.size ?? 1 } },
      vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    this.kodiMat = material({ kodi: true, drift: 0.02 });
    this.kodi = toPoints(buildKodiCloud(budget.kodi, mulberry32(opts.seed + 1)), this.kodiMat);
    const { forest, stars } = buildForestCloud(budget, mulberry32(TREE_SEED));
    this.forestMat = material({ kodi: false, drift: 0.006, fade: 0, size: 1.15 });
    this.forest = toPoints(forest, this.forestMat);
    this.skyMat = material({ kodi: false, drift: 0.35, fade: 0 });
    this.sky = toPoints(stars, this.skyMat);
    this.critterMat = material({ kodi: false, drift: 0.002, fade: 0, size: 1.1 });
    this.rabbit = toPoints(buildRabbitCloud(mulberry32(opts.seed + 2)), this.critterMat);
    this.rabbit.visible = false;
    this.birds = [0, 1, 2].map((i) => {
      const b = buildBirdClouds(mulberry32(opts.seed + 3 + i));
      const wings: [THREE.Points, THREE.Points] = [toPoints(b.wings[0], this.critterMat), toPoints(b.wings[1], this.critterMat)];
      const g = new THREE.Group(); g.add(toPoints(b.body, this.critterMat), ...wings); g.visible = false;
      this.scene.add(g);
      return { g, wings };
    });
    this.scene.add(this.kodi, this.forest, this.sky, this.rabbit);

    const sprite = (tex: THREE.Texture) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.glow = sprite(glowTexture('rgba(255,236,200,0.7)', 'rgba(255,214,150,0.25)')); this.glow.scale.set(4, 4, 1);
    this.buddy = sprite(glowTexture('rgba(255,250,220,1)', 'rgba(255,200,90,0.5)')); this.buddy.scale.set(0.55, 0.55, 1);
    this.scene.add(this.glow, this.buddy);

    this.resize();
    this.camera.lookAt(0, -0.25, 0);
  }

  setScroll(p: number) { this.scrollP = p; }
  setHeart(amount: number) { this.heartTarget = this.mode === 'signin' ? 0 : clamp01(amount); }
  setTyping(typing: Typing, typedLen: number) {
    this.typing = typing; this.typedLen = typedLen;
    if (typing !== 'idle') this.typedAt = this.elapsed;
  }
  /** Where the pointer is, in normalised device coordinates; `inside` false when it left the page. */
  setPointer(nx: number, ny: number, inside: boolean) {
    this.mouseIn = inside;
    if (!inside) return;
    const v = new THREE.Vector3(nx, ny, 0.5).unproject(this.camera);
    const dir = v.sub(this.camera.position).normalize();
    this.mouseTarget.copy(this.camera.position).addScaledVector(dir, -this.camera.position.z / dir.z);
    this.mouseX = nx;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.kscale = w < 760 ? Math.min(0.55, this.tierScale) : this.tierScale;
  }

  resume() {
    if (this.disposed || this.running) return;
    this.running = true; this.lastNow = null;
    this.raf = requestAnimationFrame(this.tick);
  }
  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  dispose() {
    this.pause();
    this.disposed = true;
    this.scene.traverse((o) => {
      if (o instanceof THREE.Points) o.geometry.dispose();
      if (o instanceof THREE.Sprite) { o.material.map?.dispose(); o.material.dispose(); }
    });
    for (const m of [this.kodiMat, this.forestMat, this.skyMat, this.critterMat]) m.dispose();
    this.renderer.dispose();
  }

  private tick = (now: number) => {
    if (!this.running) return;
    const dt = this.lastNow === null ? 0 : Math.min(0.1, (now - this.lastNow) / 1000);
    this.lastNow = now;
    this.elapsed += dt;
    this.frame(dt);
    this.raf = requestAnimationFrame(this.tick);
  };

  private pick(t: number) {
    const names = (Object.keys(ACTS) as (keyof typeof ACTS)[]).filter((n) => n !== this.lastAct && n !== 'wave');
    const name: keyof typeof ACTS = this.act.name === 'none' ? 'wave' : names[Math.floor(this.random() * names.length)];
    this.lastAct = name; this.act = { name, start: t, dur: ACTS[name] }; this.nextAt = t + ACTS[name] + 1.2 + this.random() * 1.6;
  }

  private frame(dt: number) {
    const t = this.elapsed, p = this.scrollP, SIGNIN = this.mode === 'signin';
    const o = opening(t), sc = scrolled(p);
    const u = this.shared;
    this.sScatter += (sc.scatter - this.sScatter) * 0.08;
    this.sHeart += (this.heartTarget - this.sHeart) * 0.06;
    u.uIntro.value = o.formed; u.uTime.value = t; u.uScatter.value = this.sScatter; u.uHeart.value = Math.min(1, this.sHeart);
    // the forest grows in around Kodi, and dims behind the words as you scroll
    const woods = o.woods * sc.woodsDim;
    this.forestMat.uniforms.uFade.value = woods; this.skyMat.uniforms.uFade.value = clamp01((t - 0.2) / 2) * (1 - 0.3 * clamp01(p));
    if (this.woods) {
      this.woods.style.opacity = String(clamp01((t - 0.3) / 1.6) * (1 - 0.45 * clamp01(p / 0.9)));
      this.woods.style.transform = `translate(${-this.mouseX * 4 * this.hover - Math.sin(t * 0.07) * 3}px, ${p * 10}px)`;
    }
    const alone = o.alone * (1 - this.sScatter);
    this.hover += ((this.mouseIn ? 1 : 0) * alone - this.hover) * 0.06;
    (u.uMouse.value as THREE.Vector3).lerp(this.mouseTarget, 0.18); u.uHover.value = this.hover;

    // what Kodi is doing right now
    if (alone > 0.5 && t > this.nextAt) this.pick(t);
    const act = this.act;
    const ph = act.dur ? clamp01((t - act.start) / act.dur) : 1, live = ph < 1 ? 1 : 0, env = Math.sin(Math.PI * ph) * live;
    let jump = 0, squash = 0, armR = 0.15 * Math.sin(t * 1.3), armL = -0.15 * Math.sin(t * 1.3 + 1), spin = 0, look = 0;
    if (act.name === 'wave' && live) { armR = env * (2.5 + 0.35 * Math.sin(t * 11)); armL = env * 0.4; look = 0.15 * env; }
    if ((act.name === 'hop' || act.name === 'hops') && live) {
      const n = act.name === 'hop' ? 1 : 2, q = (ph * n) % 1;
      jump = Math.sin(Math.PI * q) * 0.55; squash = q < 0.12 || q > 0.88 ? 0.12 : -0.05; armR = armL = 0.9 * Math.sin(Math.PI * q);
    }
    if (act.name === 'twirl' && live) { spin = smooth(ph) * Math.PI * 2; armR = armL = 1.2 * env; jump = 0.2 * env; }
    if (act.name === 'look' && live) look = 0.5 * env * Math.sin(t * 1.6);
    // play: the firefly friend swoops close, Kodi hops after it and follows it with his eyes
    const near = act.name === 'play' && live ? env : 0;
    const ang = t * (0.6 + near * 1.2), rad = 2.4 - near * 1.1;
    const K = this.kscale;
    this.buddy.position.set(this.kodi.position.x + Math.cos(ang) * rad * K * 1.4, (0.9 + Math.sin(t * 1.7) * 0.45 - near * 0.4) * K, Math.sin(ang) * 1.3);
    if (near) { jump = Math.abs(Math.sin(t * 6)) * 0.28 * near; look = Math.atan2(this.buddy.position.x, 3) * 1.4 * near; armR = armL = 1.4 * near; }
    // the wind comes in gusts
    u.uWind.value = 0.8 + 0.9 * Math.pow(Math.max(0, Math.sin(t * 0.23)), 3);
    this.critterMat.uniforms.uFade.value = woods;
    // a rabbit hops across behind Kodi every so often, stopping halfway to nibble the grass
    const ru = (t - 6) % 16;
    this.rabbit.visible = t > 6 && ru < 9;
    if (this.rabbit.visible) {
      const paused = ru >= 3.2 && ru < 4.8;
      const travel = ru < 3.2 ? (ru / 3.2) * 0.36 : paused ? 0.36 : 0.36 + ((ru - 4.8) / 4.2) * 0.64;
      this.rabbit.position.set(-9 + travel * 18, GROUND + (paused ? 0 : Math.abs(Math.sin(ru * Math.PI * 2.3)) * 0.3), -1.7);
      this.rabbit.rotation.z = paused ? -0.18 - 0.06 * Math.sin(t * 9) : 0.12 * Math.sin(ru * Math.PI * 4.6);
      if (!live && alone > 0.5) look = Math.atan2(this.rabbit.position.x, 5) * 1.2; // Kodi turns to watch it
    }
    // a little flock crosses the sky
    const bu = (t - 8) % 19;
    this.birds.forEach((b, i) => {
      b.g.visible = t > 8 && bu < 11;
      if (!b.g.visible) return;
      b.g.position.set(13 - bu * 2.5 + i * 0.9, 2.5 + i * 0.35 + Math.sin(bu * 1.4 + i) * 0.15, -6 - i * 0.6);
      b.g.rotation.y = Math.PI;
      const flap = Math.sin(t * 9 + i * 1.7) * 0.75;
      b.wings[0].rotation.x = -flap; b.wings[1].rotation.x = flap;
    });
    if (this.hover > 0.3) look = this.mouseX * 0.55 * this.hover + look * (1 - this.hover);
    // a blink every few seconds: the eyes close and open over 0.18 s
    if (t > this.blinkAt) this.blinkAt = t + 2.5 + this.random() * 2.5;
    const toBlink = this.blinkAt - t;
    u.uBlink.value = toBlink < 0.18 ? 1 - 0.9 * Math.sin(Math.PI * toBlink / 0.18) : 1;
    const calm = (1 - this.sScatter) * (0.35 + 0.65 * o.formed);
    u.uArmR.value = armR * calm; u.uArmL.value = armL * calm;
    this.yaw += ((Math.sin(t * 0.45) * 0.22 + look) * calm - this.yaw) * 0.08;
    let tilt = 0;
    if (SIGNIN) {
      // watching the email being typed: turn towards the form on the left; hide from the password
      const pose = signinPose({ typing: this.typing, typedLen: this.typedLen, sinceTypedS: t - this.typedAt });
      this.attend = ease(this.attend, pose.attendTarget, dt, 5);
      this.peek = ease(this.peek, pose.peekTarget, dt, 7);
      u.uPeek.value = this.peek;
      this.yaw = this.yaw * (1 - this.attend) + pose.yawTarget * this.attend;
      tilt = 0.14 * this.attend * (1 - this.peek) - 0.05 * this.peek;
      if (this.peek > 0.5) { jump = 0; armR *= 1 - this.peek; armL *= 1 - this.peek; }
    }
    this.kodi.rotation.y = this.yaw + spin + t * 0.02 * this.sScatter;
    this.kodi.rotation.x = Math.sin(t * 0.3) * 0.04 * calm + tilt;
    const footY = GROUND + 1.57 * K; // stand on the grass
    this.kodi.position.y = (footY + jump * K) * calm + Math.sin(t * 1.1) * 0.03 * calm;
    if (SIGNIN) this.kodi.position.x = window.innerWidth > 860 ? 2.2 : 0;
    this.kodi.scale.set(K * (1 + squash * 0.6), K * (1 - squash), K * (1 + squash * 0.6));
    this.glow.material.opacity = 0.45 * (1 - this.sScatter) * clamp01((t - 2.0) / 1.5);
    this.glow.position.set(this.kodi.position.x, this.kodi.position.y - 0.45 * K, -0.7);
    this.buddy.material.opacity = clamp01((t - 4.4) / 0.8) * (1 - this.sScatter) * (0.75 + 0.25 * Math.sin(t * 9));
    this.sky.rotation.y = Math.sin(t * 0.02) * 0.04;
    this.camera.position.x = Math.sin(t * 0.07) * 0.25 + this.mouseX * 0.25 * this.hover;
    this.camera.lookAt(0, -0.25, 0);

    this.renderer.render(this.scene, this.camera);
    this.onFrame?.({
      wordIn: o.wordIn, wordGone: o.wordGone, plate: o.plate * sc.plateFade, out: Math.max(sc.out, o.wordGone), headline: sc.headline,
      woods, hint: 0.5 + 0.5 * clamp01((t - 4.4) / 0.8),
    });
  }
}
