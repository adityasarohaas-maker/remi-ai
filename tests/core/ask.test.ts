import { describe, it, expect } from 'vitest';
import { buildAskPrompt, cleanAnswer, NOTHING_FOUND } from '@/core/ask';

const memories = [
  { id: 'm1', title: 'Wedding in Ajmer', quote: 'We married in Ajmer in May, it was so hot.', summary: 'Her wedding in Ajmer.', year: 1968, confidence: 'sure' as const },
  { id: 'm2', title: 'The rose garden', quote: 'My roses were the envy of the lane.', summary: 'Her roses.', year: null, confidence: 'unsure' as const },
];

describe('cleanAnswer', () => {
  it('drops memories the model cited that were never given, and admits nothing was found', () => {
    expect(cleanAnswer({ answer: 'She loved Ajmer.', memoryIds: ['m9'], nothingFound: false }, ['m1', 'm2']))
      .toEqual({ answer: 'She loved Ajmer.', memoryIds: [], nothingFound: true });
  });
  it('keeps the ids that were really given', () => {
    expect(cleanAnswer({ answer: 'x', memoryIds: ['m1', 'm9'], nothingFound: false }, ['m1', 'm2']).memoryIds).toEqual(['m1']);
  });
});

describe('buildAskPrompt', () => {
  it('gives Remi only these memories, by id, and asks for her words', () => {
    const text = buildAskPrompt({ preferredName: 'Avni', pronoun: 'she', question: 'What was her wedding like?', memories }).map((m) => m.content).join('\n');
    expect(text).toContain('m1');
    expect(text).toContain('m2');
    expect(text).toMatch(/only these memories/i);
    expect(text).toContain('We married in Ajmer');
    expect(text).toMatch(/not sure|uncertain/i);
  });
  it('has a fixed line for when she never spoke of it', () => {
    expect(NOTHING_FOUND('Avni', 'she')).toBe("She never told me about that.");
  });
});

describe('answerQuestion', () => {
  it('never calls the model about a topic the viewer may not see, and says she never told it', async () => {
    const { answerQuestion } = await import('@/core/ask');
    let modelCalls = 0;
    const r = await answerQuestion({
      search: async () => [],       // the sealed letter is invisible to this viewer, so the search finds nothing
      newest: async () => [],
      ask: async () => { modelCalls++; return { answer: 'x', memoryIds: [], nothingFound: false }; },
    }, { preferredName: 'Avni', pronoun: 'she', question: 'What did she leave for Riya?' });
    expect(modelCalls).toBe(0);
    expect(r).toEqual({ answer: 'She never told me about that.', memoryIds: [], nothingFound: true });
  });
  it('fills a thin search with the newest memories before asking', async () => {
    const { answerQuestion } = await import('@/core/ask');
    const given: string[] = [];
    await answerQuestion({
      search: async () => [{ id: 'm1', title: 't', quote: 'q', summary: 's', year: null, confidence: 'sure' }],
      newest: async () => [{ id: 'm1', title: 't', quote: 'q', summary: 's', year: null, confidence: 'sure' }, { id: 'm2', title: 't2', quote: 'q2', summary: 's2', year: null, confidence: 'sure' }],
      ask: async (msgs) => { given.push(msgs[1].content); return { answer: 'ok', memoryIds: ['m2'], nothingFound: false }; },
    }, { preferredName: 'Avni', pronoun: 'she', question: 'roses?' });
    expect(given[0]).toContain('m2');
  });
});
