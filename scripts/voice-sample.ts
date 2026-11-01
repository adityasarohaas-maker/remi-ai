// Hear Remi: writes sample clips through the same synthesize() the app uses, with how long each took.
// npx tsx --conditions=react-server --env-file=.env.local scripts/voice-sample.ts <folder>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { synthesize, cloudVoiceConfigured } from '../src/lib/azure-tts';

const SAMPLES: [string, string, string][] = [
  ['remi-en-IN', 'en-IN', "Oh, that's a lovely thing to remember. Tell me, what did the house smell like when you came home from school?"],
  ['remi-en-US', 'en-US', "Oh, that's a lovely thing to remember. Tell me, what did the house smell like when you came home from school?"],
  ['remi-hi-IN', 'hi-IN', 'अरे, यह तो बहुत प्यारी याद है। मुझे बताइए, जब आप स्कूल से घर आती थीं, तो घर में कैसी खुशबू आती थी?'],
];

async function main() {
  const folder = process.argv[2];
  if (!folder) throw new Error('Say which folder the clips go in.');
  if (!cloudVoiceConfigured()) throw new Error('AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are not set.');
  mkdirSync(folder, { recursive: true });
  for (const [name, locale, text] of SAMPLES) {
    const started = Date.now();
    const audio = await synthesize(text, locale);
    writeFileSync(join(folder, `${name}.mp3`), Buffer.from(audio));
    console.log(name, `${Date.now() - started} ms`, `${audio.byteLength} bytes`);
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
