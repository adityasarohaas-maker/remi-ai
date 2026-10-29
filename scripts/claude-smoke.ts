// Checks the Claude key and the three call shapes the app uses. Run: npm run smoke
import { z } from 'zod';
import { chatText, chatStream, chatJson, MODELS } from '../src/lib/claude';

async function main() {
  const msgs = [{ role: 'system' as const, content: 'Reply in five words or fewer.' }, { role: 'user' as const, content: 'Say hello to Avni.' }];
  let t = Date.now();
  const text = await chatText(msgs, { model: MODELS.chat(), maxTokens: 60, effort: 'low' });
  console.log(`OK chat (${Date.now() - t} ms): ${text}`);
  t = Date.now();
  let first = 0;
  const streamed = await chatStream(msgs, { model: MODELS.chat(), maxTokens: 60, effort: 'low' }, () => { first ||= Date.now() - t; });
  console.log(`OK stream (first words ${first} ms, total ${Date.now() - t} ms): ${streamed}`);
  t = Date.now();
  const json = await chatJson([{ role: 'user', content: 'Return ok=true.' }], z.object({ ok: z.boolean() }), { model: MODELS.deep(), maxTokens: 200, effort: 'low' });
  console.log(`OK json (${Date.now() - t} ms): ${JSON.stringify(json)}`);
}
main().catch((e) => { console.error('FAILED', e?.status ?? '', e?.message ?? e); process.exit(1); });
