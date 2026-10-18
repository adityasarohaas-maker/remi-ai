'use client';
import type { Human, Config } from '@vladmandic/human';

// Loaded from the CDN at runtime so the bundler never touches the tfjs-node build.
const HUMAN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/dist/human.esm.js';
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models/';

let humanPromise: Promise<Human> | null = null;

export function loadHuman(): Promise<Human> {
  humanPromise ??= (async () => {
    const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ HUMAN_URL);
    const HumanCtor = (mod.Human ?? mod.default) as new (c: Partial<Config>) => Human;
    const human = new HumanCtor({
      modelBasePath: MODELS_URL,
      debug: false,
      face: {
        enabled: true,
        detector: { enabled: true, maxDetected: 3, rotation: false },
        mesh: { enabled: true },
        description: { enabled: true },
        iris: { enabled: false },
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      gesture: { enabled: false },
      segmentation: { enabled: false },
    } as Partial<Config>);
    await human.load();
    await human.warmup();
    return human;
  })();
  humanPromise.catch(() => { humanPromise = null; });
  return humanPromise;
}

export async function embedFrom(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<number[] | null> {
  const human = await loadHuman();
  const res = await human.detect(input);
  const faces = res.face
    .filter((f) => (f.embedding?.length ?? 0) > 0 && (f.faceScore ?? f.score ?? 0) > 0.6)
    .sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]);
  return faces[0]?.embedding ? Array.from(faces[0].embedding) : null;
}

export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = URL.createObjectURL(file);
  });
}
