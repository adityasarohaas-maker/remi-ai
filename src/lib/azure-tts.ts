// Remi's natural voice: Azure neural text-to-speech, called from the server so the key never
// reaches the tablet. Without a key (or if Azure fails) the tablet uses the browser's own voice.
import { cloudVoiceFor, hdVoiceFor, speechSsml } from '@/core/voices';

type Env = Record<string, string | undefined>;

/** Voice requests per household per minute: one per sentence, plenty for talk, a cap on runaway cost. */
export const VOICE_PER_MIN = 90;

export function cloudVoiceConfigured(env: Env = process.env): boolean {
  return Boolean(env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION);
}

/** How long the HD voice gets before the standard voice steps in, and how long that one gets after it.
 *  Together they stay inside the 8 seconds the tablet waits for a clip. */
export const HD_TIMEOUT_MS = 3000;
export const FALLBACK_TIMEOUT_MS = 4500;

export async function synthesize(
  text: string, locale: string,
  o: { env?: Env; fetcher?: typeof fetch; timeoutMs?: number; hdTimeoutMs?: number } = {},
): Promise<ArrayBuffer> {
  const env = o.env ?? process.env;
  const ask = async (voice: string, timeoutMs: number) => {
    const res = await (o.fetcher ?? fetch)(`https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY ?? '',
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'remi-ai',
      },
      body: speechSsml(text, locale, voice),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`azure tts ${res.status}`);
    return await res.arrayBuffer();
  };
  const hd = hdVoiceFor(locale);
  if (!hd) return ask(cloudVoiceFor(locale), o.timeoutMs ?? 8000);
  try {
    return await ask(hd, o.timeoutMs ?? o.hdTimeoutMs ?? HD_TIMEOUT_MS);
  } catch (e) {
    // the words stay out of the log: this is what someone's family hears
    console.warn('hd voice failed, using standard', hd, e instanceof Error ? e.message : e);
    return ask(cloudVoiceFor(locale), o.timeoutMs ?? FALLBACK_TIMEOUT_MS);
  }
}
