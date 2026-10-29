// Makes the demo memories audible: a clip per memory, in the Azure voice, unless the user recorded one.
// Run: npm run demo:clips
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import memories from '../src/demo/memories.json';
import { synthesize, cloudVoiceConfigured } from '../src/lib/azure-tts';

const DIR = join(process.cwd(), 'demo', 'clips');
const EXTS = ['.mp3', '.m4a', '.webm', '.ogg'];

async function main() {
  mkdirSync(DIR, { recursive: true });
  const have = new Set(readdirSync(DIR).map((f) => f.toLowerCase()));
  const userMade: string[] = [];
  const missing: { key: string; quote: string }[] = [];
  for (const m of memories as { key: string; quote: string }[]) {
    const own = EXTS.find((e) => have.has(`${m.key}${e}`));
    if (own) { if (!own.endsWith('.mp3') || !have.has(`${m.key}.generated`)) userMade.push(m.key); }
    else missing.push(m);
  }
  if (missing.length && !cloudVoiceConfigured()) {
    console.error(`${missing.length} clips missing and AZURE_SPEECH_KEY/REGION are not set.`);
    process.exit(1);
  }
  let generated = 0;
  for (const m of missing) {
    // an older woman's voice, unhurried: the text itself carries her pauses
    const audio = await synthesize(m.quote, 'en-IN', { timeoutMs: 30_000 });
    writeFileSync(join(DIR, `${m.key}.mp3`), Buffer.from(audio));
    writeFileSync(join(DIR, `${m.key}.generated`), '');
    generated++;
    process.stdout.write('.');
  }
  const total = (memories as unknown[]).length;
  console.log(`\n${total} clips ready (${generated} generated now, ${userMade.length} user-recorded, ${total - generated - userMade.length} generated earlier)`);
}
main().catch((e) => { console.error('FAILED', e?.message ?? e); process.exit(1); });
