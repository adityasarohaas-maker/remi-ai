import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: process.env.NEBIUS_BASE_URL ?? 'https://api.tokenfactory.nebius.com/v1/',
  apiKey: process.env.NEBIUS_API_KEY,
});

const list = await client.models.list();
const nvidia = list.data.map((m) => m.id).filter((id) => /nemotron|nvidia/i.test(id));
console.log('NVIDIA models on this key:\n ' + nvidia.join('\n '));

const thinkingOff = process.env.NEBIUS_DISABLE_THINKING === '1'
  ? { chat_template_kwargs: { enable_thinking: false } }
  : {};

for (const model of [process.env.NEBIUS_CHAT_MODEL!, process.env.NEBIUS_REPORT_MODEL!]) {
  const t0 = Date.now();
  try {
    const res = await client.chat.completions.create({
      model,
      max_tokens: 200,
      messages: [
        { role: 'system', content: 'Reply in one short, warm sentence.' },
        { role: 'user', content: 'What day is it today?' },
      ],
      ...thinkingOff,
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);
    const msg = res.choices[0]?.message as { content?: string; reasoning_content?: string };
    console.log(`\n${model}: ${Date.now() - t0} ms, finish=${res.choices[0]?.finish_reason}`);
    console.log(' content:', JSON.stringify(msg?.content));
    console.log(' reasoning_content present:', Boolean(msg?.reasoning_content));
    console.log(' usage:', res.usage);
  } catch (e) {
    console.log(`\n${model}: FAILED`, (e as Error).message);
  }
}
