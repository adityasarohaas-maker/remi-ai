import 'server-only';
import OpenAI from 'openai';
import { stripReasoning } from '@/core/text';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const MODELS = {
  chat: () => process.env.NEBIUS_CHAT_MODEL ?? 'nvidia/Nemotron-3_5-Lightning',
  report: () => process.env.NEBIUS_REPORT_MODEL ?? 'nvidia/nemotron-3-super-120b-a12b',
};

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!process.env.NEBIUS_API_KEY) throw new Error('NEBIUS_API_KEY is not set');
  client ??= new OpenAI({
    baseURL: process.env.NEBIUS_BASE_URL ?? 'https://api.tokenfactory.nebius.com/v1/',
    apiKey: process.env.NEBIUS_API_KEY,
    maxRetries: 1,
  });
  return client;
}

export async function chatText(
  messages: ChatMessage[],
  opts: { model: string; maxTokens?: number; temperature?: number; timeoutMs?: number; maxRetries?: number },
): Promise<string> {
  const extra = process.env.NEBIUS_DISABLE_THINKING === '1'
    ? { chat_template_kwargs: { enable_thinking: false } }
    : {};
  const res = await getClient().chat.completions.create(
    {
      model: opts.model,
      messages,
      max_tokens: opts.maxTokens ?? 400,
      temperature: opts.temperature ?? 0.4,
      ...extra,
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    { timeout: opts.timeoutMs ?? 20_000, ...(opts.maxRetries !== undefined ? { maxRetries: opts.maxRetries } : {}) },
  );
  return stripReasoning(res.choices[0]?.message?.content ?? '');
}

/** Streams the reply: onDelta gets each piece as it arrives. Resolves to the full text, reasoning removed. */
export async function chatStream(
  messages: ChatMessage[],
  opts: { model: string; maxTokens?: number; temperature?: number; timeoutMs?: number; maxRetries?: number },
  onDelta: (text: string) => void,
): Promise<string> {
  const extra = process.env.NEBIUS_DISABLE_THINKING === '1'
    ? { chat_template_kwargs: { enable_thinking: false } }
    : {};
  // One budget for the whole reply, not just for the first byte.
  const signal = AbortSignal.timeout(opts.timeoutMs ?? 20_000);
  const stream = await getClient().chat.completions.create(
    {
      model: opts.model,
      messages,
      max_tokens: opts.maxTokens ?? 400,
      temperature: opts.temperature ?? 0.4,
      stream: true,
      ...extra,
    } as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
    { signal, ...(opts.maxRetries !== undefined ? { maxRetries: opts.maxRetries } : {}) },
  );
  let full = '';
  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta?.content;
    if (piece) {
      full += piece;
      onDelta(piece);
    }
  }
  return stripReasoning(full);
}
