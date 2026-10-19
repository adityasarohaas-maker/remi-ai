// Remi's natural voice: Azure neural text-to-speech, called from the server so the key never
// reaches the tablet. Without a key (or if Azure fails) the tablet uses the browser's own voice.
import { speechSsml } from '@/core/voices';

type Env = Record<string, string | undefined>;

export function cloudVoiceConfigured(env: Env = process.env): boolean {
  return Boolean(env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION);
}

export async function synthesize(
  text: string, locale: string,
  o: { env?: Env; fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<ArrayBuffer> {
  const env = o.env ?? process.env;
  const res = await (o.fetcher ?? fetch)(`https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY ?? '',
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'remi-ai',
    },
    body: speechSsml(text, locale),
    signal: AbortSignal.timeout(o.timeoutMs ?? 8000),
  });
  if (!res.ok) throw new Error(`azure tts ${res.status}`);
  return res.arrayBuffer();
}
