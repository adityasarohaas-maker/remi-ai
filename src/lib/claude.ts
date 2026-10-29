import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { stripReasoning } from '@/core/text';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type Effort = 'low' | 'medium' | 'high';

export const MODELS = {
  /** Live talk on the tablet. */
  chat: () => process.env.CLAUDE_CHAT_MODEL || 'claude-opus-5-5',
  /** Memories, Ask, the book, Talk with them, the evening note. */
  deep: () => process.env.CLAUDE_DEEP_MODEL || 'claude-opus-5-5',
  /** Tried when the chat model fails before saying anything. */
  backup: () => process.env.CLAUDE_BACKUP_MODEL || null,
};

// Thinking is always on and counts toward max_tokens: the caller's budget is for the reply alone.
const THINKING_HEADROOM = 6000;
export function requestTokens(replyTokens: number): number {
  return replyTokens + THINKING_HEADROOM;
}

// A refused request is re-run on a fallback model inside the same call.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };

export function toClaude(messages: ChatMessage[]): { system: string; messages: Anthropic.Beta.BetaMessageParam[] } {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const turns = messages
    .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));
  return { system, messages: turns };
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ maxRetries: 1 });
  return client;
}

type CallOpts = { model: string; maxTokens?: number; effort?: Effort; timeoutMs?: number; maxRetries?: number };

function params(messages: ChatMessage[], opts: CallOpts) {
  const { system, messages: turns } = toClaude(messages);
  return {
    model: opts.model,
    max_tokens: requestTokens(opts.maxTokens ?? 400),
    ...(system ? { system } : {}),
    messages: turns,
    output_config: { effort: opts.effort ?? 'low' },
    ...FALLBACK,
  };
}

function requestOptions(opts: CallOpts & { signal?: AbortSignal }) {
  return {
    timeout: opts.timeoutMs ?? 20_000,
    ...(opts.maxRetries !== undefined ? { maxRetries: opts.maxRetries } : {}),
    ...(opts.signal ? { signal: opts.signal } : {}),
  };
}

function textOf(message: Anthropic.Beta.BetaMessage): string {
  if (message.stop_reason === 'refusal') throw new Error(`${message.model} refused`);
  return message.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

export async function chatText(messages: ChatMessage[], opts: CallOpts): Promise<string> {
  const res = await getClient().beta.messages.create(params(messages, opts), requestOptions(opts));
  return stripReasoning(textOf(res));
}

/** Streams the reply: onDelta gets each piece as it arrives. Resolves to the full text. */
export async function chatStream(
  messages: ChatMessage[],
  opts: CallOpts & { signal?: AbortSignal },
  onDelta: (text: string) => void,
): Promise<string> {
  // One budget for the whole reply, not just for the first byte.
  const timeout = AbortSignal.timeout(opts.timeoutMs ?? 20_000);
  const signal = opts.signal ? AbortSignal.any([timeout, opts.signal]) : timeout;
  const stream = getClient().beta.messages.stream(params(messages, opts), { ...requestOptions(opts), signal });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') onDelta(event.delta.text);
  }
  return stripReasoning(textOf(await stream.finalMessage()));
}

/** A reply that must match `schema`; throws when it doesn't or the model refused. */
export async function chatJson<T>(messages: ChatMessage[], schema: z.ZodType<T>, opts: CallOpts): Promise<T> {
  const { output_config, ...rest } = params(messages, { ...opts, maxTokens: opts.maxTokens ?? 8000 });
  const res = await getClient().beta.messages.parse(
    { ...rest, output_config: { ...output_config, format: betaZodOutputFormat(schema) } },
    requestOptions({ timeoutMs: 120_000, ...opts }),
  );
  if (res.stop_reason === 'refusal') throw new Error(`${res.model} refused`);
  if (res.parsed_output == null) throw new Error(`${res.model} returned no parseable output`);
  return res.parsed_output as T;
}
