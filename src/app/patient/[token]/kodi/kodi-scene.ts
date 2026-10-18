import * as THREE from 'three';
import { buildKodi, KODI_PIVOTS } from '@/lib/kodi-shape';
import type { KodiEmotion, KodiGesture } from '@/core/kodi';

export type KodiState = 'off' | 'listening' | 'hearing' | 'thinking' | 'speaking' | 'blocked' | 'unsupported';

const VERTEX = /* glsl */`
  attribute vec3 aColorDay; attribute vec3 aColorNight; attribute float aSize; attribute float aGroup;
  attribute vec2 aCenter; attribute vec4 aRand;
  uniform float uTime, uForm, uBlink, uTalk, uHear, uThink, uLeaf, uNight, uScale, uJump, uSquash, uTilt, uNod,
                uArmL, uArmR, uHappy, uSad, uSurprise, uSleepy, uLove, uLookX, uLookY, uPixel, uSizeK, uDist, uDim;
  varying vec3 vColor; varying float vAlpha;
  vec2 rot(vec2 p, float a) { return vec2(p.x*cos(a) - p.y*sin(a), p.x*sin(a) + p.y*cos(a)); }
  void main() {
    vec3 p = position; float g = aGroup;
    bool head = g < 0.5, eye = g > 1.5 && g < 2.5, shine = g > 2.5 && g < 3.5, cheek = g > 3.5 && g < 4.5,
         mouth = g > 4.5 && g < 5.5, leaf = g > 5.5 && g < 6.5, aura = g > 6.5 && g < 7.5,
         armL = g > 7.5 && g < 8.5, armR = g > 8.5 && g < 9.5, heart = g > 9.5;
    bool face = head || eye || shine || cheek || mouth || leaf;
    float a = 1.0;

    if (eye || shine) {                                       // the eyes carry most of the feeling
      vec2 d = p.xy - aCenter;
      float side = sign(aCenter.x);
      d *= 1.0 + 0.28*uSurprise;
      d = rot(d, side * -0.32 * uSad);
      d.y *= mix(uBlink * mix(1.0, 0.32, uSleepy) * mix(1.0, 0.8, uSad), 0.2, uHappy);
      d.y += uHappy * (0.07 - 2.4 * d.x * d.x);               // happy: ^ ^
      p.xy = aCenter + d + vec2(uLookX, uLookY) * 0.07;
      if (shine) a *= (1.0 - uHappy) * (1.0 - 0.6*uSleepy);
    }
    if (mouth) {
      vec2 d = p.xy - aCenter;
      d.y *= 1.0 + 2.6*uTalk + 1.8*uSurprise;
      d.x *= 1.0 + 0.45*uTalk + 0.6*uSurprise + 0.5*uHappy;
      d.y -= uHappy * 0.96 * d.x * d.x;
      p.xy = aCenter + d - vec2(0.0, 0.03*uTalk);
    }
    if (cheek) a = 0.45 + 0.4*uTalk + 0.5*uHappy + 0.5*uLove;
    if (leaf) {
      vec2 base = vec2(${KODI_PIVOTS.leafBase[0].toFixed(2)}, ${KODI_PIVOTS.leafBase[1].toFixed(2)});
      float side = sign(p.x - base.x);
      p.xy = base + rot(p.xy - base, uLeaf - side * 0.55 * uSad + side * 0.25 * uHappy);
    }
    if (armL) p.xy = aCenter + rot(p.xy - aCenter, -uArmL);
    if (armR) p.xy = aCenter + rot(p.xy - aCenter, uArmR);
    if (face) {
      vec2 neck = vec2(${KODI_PIVOTS.neck[0].toFixed(2)}, ${KODI_PIVOTS.neck[1].toFixed(2)});
      p.xy = neck + rot(p.xy - neck, uTilt); p.y += uNod - 0.06*uSad;
    }
    if (!aura && !heart) {                                     // squash and stretch from the feet, then jump
      float foot = ${KODI_PIVOTS.feet.toFixed(2)};
      p.y = foot + (p.y - foot) * (1.0 + uSquash);
      p.x *= 1.0 - 0.6*uSquash;
      p.y += uJump;
    }
    if (aura) {
      float ang = atan(p.y - 0.1, p.x) + uTime * (0.04 + 0.5*uThink + 0.25*uHappy) * (0.4 + aRand.x);
      float r = length(vec2(p.x, p.y - 0.1)) * (1.0 + 0.05*sin(uTime*1.2 + aRand.y*6.283) + 0.08*uHear);
      p.xy = vec2(cos(ang), sin(ang)) * r + vec2(0.0, 0.1 + uJump*0.4);
      a = (0.45 + 0.4*uThink + 0.25*uHear + 0.3*uHappy) * (0.7 + 0.3*sin(uTime*2.6 + aRand.x*30.0));
    }
    if (heart) {
      float k = fract(uTime * 0.22 + aRand.x);
      p.xy = aCenter + p.xy * (0.7 + 0.5*k) + vec2(0.12*sin(uTime*1.5 + aRand.x*6.0), k * 1.3);
      a = uLove * smoothstep(0.0, 0.15, k) * (1.0 - smoothstep(0.65, 1.0, k));
    }
    float s = (1.0 + 0.016*sin(uTime*mix(1.55, 0.8, uSleepy)) + 0.055*uHear + 0.02*uTalk) * uScale;
    p.xy *= s;
    p += 0.011 * vec3(sin(uTime*1.7 + aRand.x*40.0), cos(uTime*1.3 + aRand.y*40.0), sin(uTime*1.1 + aRand.z*40.0));
    if (!aura && !heart) p.xy += uThink * 0.045 * vec2(-p.y, p.x) * sin(uTime*2.2 + aRand.w*6.283);
    p.xy = rot(p.xy, -0.075*uHear);
    vec3 start = (aRand.xyz - 0.5) * vec3(14.0, 10.0, 6.0);  // particles fly in and form Kodi
    float f = smoothstep(0.0, 1.0, clamp(uForm*1.25 - aRand.w*0.25, 0.0, 1.0));
    if (!heart) p = mix(start, p, f);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.7 + 0.3*sin(uTime*2.6 + aRand.x*30.0);
    gl_PointSize = aSize * uPixel * uSizeK * (uDist / -mv.z) * (aura ? tw * (1.0 + 0.6*uNight) : 1.0);
    vColor = mix(aColorDay, aColorNight, uNight);
    if (eye) a *= 1.0 - uNight;                                 // at night the eyes are hollows ringed with light
    if (mouth) a *= mix(1.0, 0.55 + 0.45*uTalk + 0.4*uSurprise, uNight);
    vAlpha = a * f * uDim;
  }`;

const FRAGMENT = /* glsl */`
  uniform float uNight;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5; float d = length(c);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor, mix(smoothstep(0.5, 0.15, d), exp(-d*d*16.0), uNight) * vAlpha);
  }`;

const ease = (k: number) => k * k * (3 - 2 * k);
const bump = (k: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, k)));
type Pose = Partial<Record<'jump' | 'squash' | 'tilt' | 'nod' | 'armL' | 'armR' | 'lookX' | 'lookY', number>>;
const GESTURES: Record<KodiGesture | 'tiltOther' | 'armSwing', { dur: number; f: (k: number) => Pose }> = {
  jump: { dur: 0.9, f: (k) => {
    const air = (k - 0.18) / 0.62;
    return {
      jump: air > 0 && air < 1 ? 0.55 * bump(air) : 0,
      squash: k < 0.18 ? -0.12 * bump(k / 0.18) : air >= 1 ? -0.1 * bump((k - 0.8) / 0.2) : 0.07 * bump(air),
      armL: 0.9 * bump(k), armR: 0.9 * bump(k),
    };
  } },
  hop: { dur: 0.5, f: (k) => ({ jump: 0.2 * bump(k), squash: 0.04 * bump(k) }) },
  wave: { dur: 2.0, f: (k) => { const up = ease(Math.min(1, k * 4)) * ease(Math.min(1, (1 - k) * 4)); return { armR: up * (1.2 + 0.32 * Math.sin(k * Math.PI * 8)), tilt: -0.08 * up }; } },
  nod: { dur: 0.9, f: (k) => ({ nod: -0.07 * Math.sin(k * Math.PI * 2) * (1 - k * 0.3) }) },
  tilt: { dur: 1.6, f: (k) => ({ tilt: 0.22 * bump(k) }) },
  tiltOther: { dur: 1.6, f: (k) => ({ tilt: -0.22 * bump(k) }) },
  armsUp: { dur: 1.3, f: (k) => ({ armL: 1.25 * bump(k), armR: 1.25 * bump(k), jump: 0.12 * bump(k * 2), squash: 0.03 * bump(k) }) },
  armSwing: { dur: 1.2, f: (k) => ({ armL: 0.5 * bump(k) * Math.sin(k * Math.PI * 2), armR: 0.5 * bump(k) * Math.sin(k * Math.PI * 2 + 1) }) },
  dance: { dur: 2.6, f: (k) => ({ tilt: 0.16 * Math.sin(k * Math.PI * 4), jump: 0.14 * Math.abs(Math.sin(k * Math.PI * 4)), armL: 0.9 * (0.5 + 0.5 * Math.sin(k * Math.PI * 4)), armR: 0.9 * (0.5 - 0.5 * Math.sin(k * Math.PI * 4)) }) },
  look: { dur: 2.4, f: (k) => ({ lookX: Math.sin(k * Math.PI * 2) * bump(k), lookY: 0.4 * bump(k), tilt: 0.06 * Math.sin(k * Math.PI * 2) }) },
};
const EMOTIONS: Record<KodiEmotion, Partial<Record<'happy' | 'sad' | 'surprise' | 'sleepy' | 'love', number>>> = {
  calm: {}, happy: { happy: 1 }, excited: { happy: 1 }, caring: { sad: 1, love: 0.35 },
  surprised: { surprise: 1 }, sleepy: { sleepy: 1 }, love: { happy: 0.6, love: 1 },
};
const SPEAK_MOVES: (keyof typeof GESTURES)[] = ['nod', 'tilt', 'tiltOther', 'hop', 'armSwing', 'nod', 'tilt', 'wave'];
const IDLE_MOVES: (keyof typeof GESTURES)[] = ['look', 'tilt', 'tiltOther', 'look'];

const UNIFORMS = ['uTime', 'uForm', 'uBlink', 'uTalk', 'uHear', 'uThink', 'uLeaf', 'uNight', 'uScale', 'uJump', 'uSquash', 'uTilt', 'uNod',
  'uArmL', 'uArmR', 'uHappy', 'uSad', 'uSurprise', 'uSleepy', 'uLove', 'uLookX', 'uLookY', 'uPixel', 'uSizeK', 'uDist', 'uDim'] as const;

/** Kodi made of light, drawn into a canvas. All motion is driven from here; React only sends events. */
export class KodiScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  private points: THREE.Points;
  private halo: THREE.Sprite;
  private mat: THREE.ShaderMaterial;
  private U: Record<(typeof UNIFORMS)[number], { value: number }>;
  private clock = new THREE.Clock();
  private raf = 0;
  private resizeObs: ResizeObserver;
  private state: KodiState = 'listening';
  private emotion: KodiEmotion = 'calm';
  private emo = { happy: 0, sad: 0, surprise: 0, sleepy: 0, love: 0 };
  private active: { name: keyof typeof GESTURES; t0: number }[] = [];
  private talk = 0; private talkTarget = 0; private lastBeat = -9; private nextSyllable = 0;
  private blinkAt = 2; private blinkT = -1; private nextMove = 4;
  private night = 0; private nightTarget = 0; private formStart = 0;

  constructor(private canvas: HTMLCanvasElement, opts: { night: boolean; density: number; reducedMotion: boolean }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    const k = buildKodi(opts.density);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(k.position, 3));
    geo.setAttribute('aColorDay', new THREE.Float32BufferAttribute(k.colorDay, 3));
    geo.setAttribute('aColorNight', new THREE.Float32BufferAttribute(k.colorNight, 3));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(k.size, 1));
    geo.setAttribute('aGroup', new THREE.Float32BufferAttribute(k.group, 1));
    geo.setAttribute('aCenter', new THREE.Float32BufferAttribute(k.center, 2));
    geo.setAttribute('aRand', new THREE.Float32BufferAttribute(k.rand, 4));
    this.U = Object.fromEntries(UNIFORMS.map((n) => [n, { value: 0 }])) as KodiScene['U'];
    Object.assign(this.U, { uBlink: { value: 1 }, uScale: { value: 1 }, uDim: { value: 1 }, uSizeK: { value: 1 }, uDist: { value: 10 } });
    this.U.uPixel.value = this.renderer.getPixelRatio();
    this.mat = new THREE.ShaderMaterial({ uniforms: this.U, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false });
    this.points = new THREE.Points(geo, this.mat);
    this.scene.add(this.points);

    // a soft inner glow behind the particles gives Kodi volume
    const gc = document.createElement('canvas'); gc.width = gc.height = 256;
    const gx = gc.getContext('2d')!, grd = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    gx.fillStyle = grd; gx.fillRect(0, 0, 256, 256);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false }));
    this.halo.position.z = -0.8;
    this.scene.add(this.halo);

    this.setNight(opts.night, true);
    this.reducedMotion = opts.reducedMotion;
    if (opts.reducedMotion) this.U.uForm.value = 1; else this.formStart = performance.now();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.resize();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.loop();
  }

  private reducedMotion = false;

  setState(s: KodiState) {
    if (s === this.state) return;
    this.state = s;
    if (s === 'thinking') this.play('look');
    if (s === 'speaking') this.nextMove = this.clock.elapsedTime + 0.5;
  }

  setEmotion(e: KodiEmotion) {
    if (e === this.emotion) return;
    this.emotion = e;
    if (e === 'excited') this.play('jump');
    if (e === 'surprised' || e === 'happy') this.play('hop');
    if (e === 'love') this.play('armsUp');
  }

  play(g: KodiGesture | 'tiltOther' | 'armSwing') {
    if (this.reducedMotion) return;
    if (this.active.some((a) => a.name === g)) return;
    this.active.push({ name: g, t0: this.clock.elapsedTime });
  }

  /** One spoken word: the mouth opens. */
  wordBeat() { this.talkTarget = 1; this.lastBeat = this.clock.elapsedTime; }

  setNight(night: boolean, now = false) {
    this.nightTarget = night ? 1 : 0;
    if (now) this.night = this.nightTarget;
    this.mat.blending = night ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.mat.needsUpdate = true;
  }

  reform() { if (!this.reducedMotion) this.formStart = performance.now(); }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.points.geometry.dispose(); this.mat.dispose();
    (this.halo.material as THREE.SpriteMaterial).map?.dispose(); this.halo.material.dispose();
    this.renderer.dispose();
  }

  private onVisibility = () => {
    cancelAnimationFrame(this.raf);
    if (!document.hidden) { this.clock.getDelta(); this.loop(); }
  };

  private resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // fit Kodi (about 4.4 tall with its leaf and a little room, 3.4 wide) into the canvas
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 2;
    const dist = Math.max(4.4 / tan, 3.4 / (tan * this.camera.aspect));
    this.camera.position.set(0, 0.12, dist);
    this.camera.updateProjectionMatrix();
    this.U.uDist.value = dist;
    // particle size follows how big Kodi is on screen (tuned at ~420 px tall)
    this.U.uSizeK.value = Math.max(0.55, Math.min(1.6, ((h * 3.7) / (tan * dist)) / 420 * 1.0));
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.frame();
  };

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05), t = this.clock.elapsedTime, U = this.U;
    const approach = (name: (typeof UNIFORMS)[number], v: number, k: number) => { U[name].value += (v - U[name].value) * Math.min(1, dt * k); };
    const still = this.reducedMotion;
    U.uTime.value = still ? 0 : t;
    if (!still) U.uForm.value = Math.min(1, (performance.now() - this.formStart) / 2600);
    approach('uHear', this.state === 'hearing' ? 1 : 0, 4);
    approach('uThink', this.state === 'thinking' ? 1 : 0, 3);
    approach('uDim', this.state === 'blocked' || this.state === 'unsupported' ? 0.55 : 1, 3);
    this.night += (this.nightTarget - this.night) * Math.min(1, dt * 2.5);
    U.uNight.value = this.night;
    const want = { happy: 0, sad: 0, surprise: 0, sleepy: 0, love: 0, ...EMOTIONS[this.emotion] };
    for (const key of Object.keys(this.emo) as (keyof typeof this.emo)[]) this.emo[key] += (want[key] - this.emo[key]) * Math.min(1, dt * 3);
    U.uHappy.value = this.emo.happy; U.uSad.value = this.emo.sad; U.uSurprise.value = this.emo.surprise;
    U.uSleepy.value = this.emo.sleepy; U.uLove.value = this.emo.love;

    // mouth: real word beats when the voice reports them; a gentle syllable rhythm when it doesn't
    const speaking = this.state === 'speaking';
    if (speaking && t - this.lastBeat > 0.6 && t > this.nextSyllable) {
      this.talkTarget = 0.45 + Math.random() * 0.55; this.nextSyllable = t + 0.09 + Math.random() * 0.13;
    }
    this.talk += (this.talkTarget - this.talk) * Math.min(1, dt * 22);
    this.talkTarget *= Math.pow(0.0009, dt);
    if (!speaking) this.talkTarget = 0;
    U.uTalk.value = still ? 0 : this.talk;

    // body language: lively while talking, gentle while listening; feelings change the mix
    if (!still && t > this.nextMove && this.active.length === 0 && U.uForm.value >= 1 && this.state !== 'off') {
      let pool = speaking ? SPEAK_MOVES : IDLE_MOVES;
      if (this.emotion === 'excited') pool = ['jump', 'armsUp', 'dance', 'hop'];
      if (this.emotion === 'happy' && !speaking) pool = ['hop', 'look', 'tilt', 'armSwing'];
      if (this.emotion === 'caring') pool = ['tilt', 'nod'];
      if (this.emotion === 'sleepy') pool = ['tiltOther', 'nod'];
      this.play(pool[Math.floor(Math.random() * pool.length)]);
      const gap = speaking ? 1.2 + Math.random() * 1.4 : this.emotion === 'excited' ? 1.5 + Math.random() : 6 + Math.random() * 6;
      this.nextMove = t + gap * (this.emotion === 'sleepy' ? 2 : 1);
    }
    const g: Required<Pose> = { jump: 0, squash: 0, tilt: 0, nod: 0, armL: 0, armR: 0, lookX: 0, lookY: 0 };
    this.active = this.active.filter((a) => {
      const spec = GESTURES[a.name], k = (t - a.t0) / spec.dur;
      if (k >= 1) return false;
      const v = spec.f(k);
      for (const key of Object.keys(v) as (keyof Pose)[]) g[key] += v[key] ?? 0;
      return true;
    });
    const restArms = 0.12 + 0.05 * Math.sin(t * 1.5);
    approach('uJump', g.jump, 18); approach('uSquash', g.squash, 18); approach('uTilt', g.tilt - 0.06 * this.emo.sleepy, 10);
    approach('uNod', g.nod, 14); approach('uArmL', restArms + g.armL, 12); approach('uArmR', restArms + g.armR, 12);
    approach('uLookX', g.lookX, 8); approach('uLookY', g.lookY, 8);

    if (!still) {
      if (this.blinkT < 0 && t > this.blinkAt) this.blinkT = 0;
      if (this.blinkT >= 0) {
        this.blinkT += dt; const k = this.blinkT / (this.emo.sleepy > 0.5 ? 0.45 : 0.2);
        U.uBlink.value = k < 0.5 ? 1 - k * 1.85 : Math.min(1, 0.075 + (k - 0.5) * 1.85);
        if (k >= 1) { this.blinkT = -1; U.uBlink.value = 1; this.blinkAt = t + 2.5 + Math.random() * 4; }
      }
    }
    U.uLeaf.value = still ? 0 : 0.07 * Math.sin(t * 1.2) + (0.12 * U.uHear.value + 0.1 * this.talk + 0.15 * this.emo.happy) * Math.sin(t * 5.5) + 0.2 * U.uJump.value;
    this.points.rotation.y = still ? 0 : 0.2 * Math.sin(t * 0.33) + 0.12 * U.uHear.value + 0.25 * U.uLookX.value;
    this.points.rotation.x = still ? 0 : 0.05 * Math.sin(t * 0.27) - 0.1 * U.uLookY.value;

    const hm = this.halo.material as THREE.SpriteMaterial;
    hm.color.set('#d9f2e1').lerp(new THREE.Color('#7b5cff'), this.night).lerp(new THREE.Color('#ffc2d9'), this.emo.love * 0.5);
    hm.blending = this.night > 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending;
    hm.opacity = (0.55 - 0.2 * this.night) * (1 + 0.35 * U.uHear.value + 0.5 * this.talk + 0.3 * this.emo.happy) * Math.min(1, U.uForm.value * 1.5) * U.uDim.value;
    const hs = 4.6 * (1 + 0.02 * Math.sin(t * 1.55) + 0.06 * U.uHear.value + 0.04 * this.talk);
    this.halo.scale.set(hs, hs * 1.08, 1);
    this.halo.position.y = 0.1 + U.uJump.value * 0.8;

    this.renderer.render(this.scene, this.camera);
  }
}
