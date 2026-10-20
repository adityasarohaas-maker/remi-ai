import 'server-only';
import OpenAI from 'openai';
import { stripReasoning } from '@/core/text';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const MODELS = {
  chat: () => process.env.NEBIUS_CHAT_MODEL ?? 'nvidia/Nemotron-3_5-Lightning',
  report: () => process.env.NEBIUS_REPORT_MODEL ?? 'nvidia/nemotron-3-super-120b-a12b',
  /** Tried when the chat model fails before saying anything (a provider can retire a model overnight). */
  backup: () => process.env.NEBIUS_BACKUP_MODEL || null,
  /** Tells the stories: a stronger model, still quick to start. Falls back to the chat model. */
  story: () => process.env.NEBIUS_STORY_MODEL || process.env.NEBIUS_CHAT_MODEL || 'nvidia/Nemotron-3_5-Lightning',
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
  opts: {
    model: string; maxTokens?: number; temperature?: number; timeoutMs?: number; maxRetries?: number;
    /** Give up if no words have come by then: some models stall now and then, and a backup is faster. */
    firstWordsMs?: number;
  },
  onDelta: (text: string) => void,
): Promise<string> {
  const extra = process.env.NEBIUS_DISABLE_THINKING === '1'
    ? { chat_template_kwargs: { enable_thinking: false } }
    : {};
  // One budget for the whole reply, not just for the first byte; and a shorter one for the first words.
  const stalled = new AbortController();
  const stallTimer = opts.firstWordsMs ? setTimeout(() => stalled.abort(new Error(`no words in ${opts.firstWordsMs} ms`)), opts.firstWordsMs) : undefined;
  const signal = AbortSignal.any([AbortSignal.timeout(opts.timeoutMs ?? 20_000), stalled.signal]);
  try {
    return await streamText();
  } finally {
    clearTimeout(stallTimer);
  }

  async function streamText(): Promise<string> {
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
        clearTimeout(stallTimer);
        full += piece;
        onDelta(piece);
      }
    }
    return stripReasoning(full);
  }
}
