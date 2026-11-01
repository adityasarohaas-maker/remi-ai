// Remi's natural voice: Azure neural text-to-speech, called from the server so the key never
// reaches the tablet. Without a key (or if Azure fails) the tablet uses the browser's own voice.
import { cloudVoiceFor, hdVoiceFor, speechSsml } from '@/core/voices';
import { isDemoHousehold } from '@/core/demo';

type Env = Record<string, string | undefined>;

/** Voice requests per household per minute: one per sentence, plenty for talk, a cap on runaway cost. */
export const VOICE_PER_MIN = 90;
/** A ceiling on a day's cost, far above a real day of talk; the demo link is public, so its day is smaller. */
export const VOICE_PER_DAY = 1500;
export const DEMO_VOICE_PER_DAY = 400;
const DAY_SECONDS = 86_400;

type TakeToken = (householdId: string, bucket: string, limit: number, windowSeconds: number) => Promise<boolean>;

/** Asked before Azure is paid for a clip. Without this the words are spent even when the answer is no. */
export async function voiceAllowed(take: TakeToken, householdId: string): Promise<boolean> {
  if (!(await take(householdId, 'voice', VOICE_PER_MIN, 60))) return false;
  return take(householdId, 'voice-day', isDemoHousehold(householdId) ? DEMO_VOICE_PER_DAY : VOICE_PER_DAY, DAY_SECONDS);
}

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
