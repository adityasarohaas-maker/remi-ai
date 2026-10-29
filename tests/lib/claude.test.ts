import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
import { toClaude, MODELS, requestTokens } from '@/lib/claude';

describe('toClaude', () => {
  it('joins system messages and keeps the turns in order', () => {
    expect(toClaude([
      { role: 'system', content: 'A' }, { role: 'system', content: 'B' },
      { role: 'user', content: 'hi' }, { role: 'assistant', content: 'yo' },
    ])).toEqual({ system: 'A\n\nB', messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'yo' }] });
  });

  it('gives an empty system prompt when there is none', () => {
    expect(toClaude([{ role: 'user', content: 'hi' }]).system).toBe('');
  });
});

describe('MODELS', () => {
  afterEach(() => { vi.unstubAllEnvs(); });
  it('defaults to Opus 5.5 for chat and deep work', () => {
    vi.stubEnv('CLAUDE_CHAT_MODEL', '');
    vi.stubEnv('CLAUDE_DEEP_MODEL', '');
    expect(MODELS.chat()).toBe('claude-opus-5-5');
    expect(MODELS.deep()).toBe('claude-opus-5-5');
  });
  it('reads the model from the environment', () => {
    vi.stubEnv('CLAUDE_CHAT_MODEL', 'claude-haiku-5-5');
    expect(MODELS.chat()).toBe('claude-haiku-5-5');
  });
});

describe('requestTokens', () => {
  it('leaves room for thinking on top of the reply budget', () => {
    expect(requestTokens(400)).toBeGreaterThanOrEqual(400 + 4000);
  });
});
