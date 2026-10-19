import { describe, it, expect, vi } from 'vitest';
import { synthesize, cloudVoiceConfigured } from '@/lib/azure-tts';

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
    expect(String(init.body)).toContain('en-IN-NeerjaNeural');
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
