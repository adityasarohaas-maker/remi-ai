import { describe, it, expect } from 'vitest';
import { clipPath, validateClip, isUuid, MAX_CLIP_BYTES } from '@/core/recording';
import { createRecorder } from '@/app/patient/[token]/recorder';

describe('clipPath', () => {
  it('files a clip under the household and the UTC day', () => {
    expect(clipPath('h1', new Date('2026-10-29T23:30:00Z'), 'abc')).toBe('h1/2026-10-29/abc.webm');
  });
});

describe('validateClip', () => {
  it('accepts a small webm clip', () => { expect(validateClip('audio/webm;codecs=opus', 1000)).toBe('ok'); });
  it('rejects a clip over the size limit', () => { expect(validateClip('audio/webm', MAX_CLIP_BYTES + 1)).toBe('too_big'); });
  it('rejects anything that is not audio', () => { expect(validateClip('video/mp4', 10)).toBe('bad_type'); });
});

describe('isUuid', () => {
  it('accepts a v4 uuid and nothing else', () => {
    expect(isUuid('0b2d3b1e-4c7a-4d2a-9c1f-7f1e2a3b4c5d')).toBe(true);
    expect(isUuid('../../etc/passwd')).toBe(false);
  });
});

describe('createRecorder', () => {
  it('reports it cannot record when the browser has no microphone API, and never throws', async () => {
    const r = createRecorder({});
    await expect(r.start()).resolves.toBe(false);
    await expect(r.stop()).resolves.toBeNull();
  });
  it('reports it cannot record when the microphone is refused', async () => {
    const r = createRecorder({ getUserMedia: async () => { throw new Error('NotAllowedError'); }, MediaRecorder: class {} as never });
    await expect(r.start()).resolves.toBe(false);
  });
});
