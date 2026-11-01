import { describe, it, expect, vi } from 'vitest';
import { synthesize, cloudVoiceConfigured, HD_TIMEOUT_MS, FALLBACK_TIMEOUT_MS } from '@/lib/azure-tts';

describe('synthesize (Azure text-to-speech)', () => {
  const env = { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'centralindia' };

  it('posts SSML for the family locale to the region endpoint and returns mp3 bytes', async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const audio = await synthesize('Hello Avni', 'en-IN', { env, fetcher });
    expect(new Uint8Array(audio)).toEqual(new Uint8Array([1, 2, 3]));
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://centralindia.tts.speech.microsoft.com/cognitiveservices/v1');
    const headers = init.headers as Record<string, string>;
    expect(headers['Ocp-Apim-Subscription-Key']).toBe('k');
    expect(headers['Content-Type']).toBe('application/ssml+xml');
    expect(headers['X-Microsoft-OutputFormat']).toBe('audio-24khz-48kbitrate-mono-mp3');
    expect(String(init.body)).toContain('en-IN-Neerja:DragonHDLatestNeural');
  });

  it('falls back to the standard voice when the HD voice is refused, so Remi is never silent', async () => {
    const fetcher = vi.fn(async (_url: string, init: RequestInit) =>
      String(init.body).includes('DragonHD') ? new Response('busy', { status: 429 }) : new Response(new Uint8Array([7]), { status: 200 }));
    const audio = await synthesize('Hello', 'en-IN', { env, fetcher: fetcher as unknown as typeof fetch });
    expect(new Uint8Array(audio)).toEqual(new Uint8Array([7]));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1][1].body)).toContain('en-IN-NeerjaNeural');
  });

  it('falls back to the standard voice when the HD voice is too slow', async () => {
    const fetcher = vi.fn((_url: string, init: RequestInit) => String(init.body).includes('DragonHD')
      ? new Promise<Response>((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('timed out'))))
      : Promise.resolve(new Response(new Uint8Array([9]), { status: 200 })));
    const audio = await synthesize('Hello', 'en-IN', { env, fetcher: fetcher as unknown as typeof fetch, hdTimeoutMs: 5 });
    expect(new Uint8Array(audio)).toEqual(new Uint8Array([9]));
  });

  it('asks once for a language with no HD voice', async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 }));
    await synthesize('Hello', 'bn-IN', { env, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body)).toContain('bn-IN-TanishaaNeural');
  });

  it('keeps every attempt inside the 8 seconds the tablet waits', () => {
    expect(HD_TIMEOUT_MS + FALLBACK_TIMEOUT_MS).toBeLessThan(8000);
  });

  it('throws when Azure refuses, so the tablet falls back to the browser voice', async () => {
    const fetcher = vi.fn(async () => new Response('no', { status: 401 }));
    await expect(synthesize('Hi', 'en-US', { env, fetcher })).rejects.toThrow('azure tts 401');
  });

  it('is off without a key or region', () => {
    expect(cloudVoiceConfigured({})).toBe(false);
    expect(cloudVoiceConfigured({ AZURE_SPEECH_KEY: 'k' })).toBe(false);
    expect(cloudVoiceConfigured(env)).toBe(true);
  });
});
