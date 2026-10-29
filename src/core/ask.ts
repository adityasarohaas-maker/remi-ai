// Ask: the family asks about her, Remi answers only from what she really said, and plays the clip.
import { z } from 'zod';
import type { ChatMessage } from '@/lib/claude';

export const AnswerSchema = z.object({
  answer: z.string(),
  memoryIds: z.array(z.string()),
  nothingFound: z.boolean(),
});
export type Answer = z.infer<typeof AnswerSchema>;

export type Pronoun = 'she' | 'he' | 'they';
export interface AskMemory { id: string; title: string; quote: string; summary: string; year: number | null; confidence: 'sure' | 'unsure' }

export const NOTHING_FOUND = (name: string, pronoun: Pronoun) =>
  `${pronoun === 'she' ? 'She' : pronoun === 'he' ? 'He' : 'They'} never told me about that.`;

export const RETRIEVE_LIMIT = 12;
export const MIN_HITS = 3;
export const ANSWER_WORDS = 90;

export function buildAskPrompt(i: { preferredName: string; pronoun: Pronoun; question: string; memories: AskMemory[] }): ChatMessage[] {
  const cap = i.pronoun === 'she' ? 'She' : i.pronoun === 'he' ? 'He' : 'They';
  const list = i.memories.map((m) =>
    `- id ${m.id} · "${m.title}"${m.year ? ` (${m.year})` : ''}${m.confidence === 'unsure' ? ' [she was not sure about this one]' : ''}\n  Her words: "${m.quote}"\n  In short: ${m.summary}`,
  ).join('\n');
  return [
    {
      role: 'system',
      content: `You are Remi. ${i.preferredName} told you her life stories, in her own words, and now ${i.preferredName}'s family is asking about her. Speak about her warmly, in the third person (${i.pronoun}), as a friend who listened, in at most ${ANSWER_WORDS} words.

Rules:
- Use only these memories. Nothing else about her exists. Never invent a detail, a feeling, or an opinion she did not say.
- Quote her words where you can ("she said: ...").
- When a memory is marked as one she was not sure about, say so ("she wasn't sure", "we're not certain").
- If none of the memories answer the question, set nothingFound to true, say "${NOTHING_FOUND(i.preferredName, i.pronoun)}" and offer the titles of the one or two closest memories instead.
- memoryIds: the ids of the memories your answer draws on, and only those. Empty when nothingFound.
- Never speak as ${i.preferredName}. ${cap} is being remembered, not imitated.`,
    },
    { role: 'user', content: `Question from the family: ${i.question}\n\nMemories:\n${list || '- (none)'}` },
  ];
}

/** The model may only cite what it was given; an answer that cites nothing real is no answer. */
export function cleanAnswer(raw: Answer, retrievedIds: string[]): Answer {
  const allowed = new Set(retrievedIds);
  const memoryIds = raw.memoryIds.filter((id) => allowed.has(id));
  if (!memoryIds.length && !raw.nothingFound) return { answer: raw.answer, memoryIds: [], nothingFound: true };
  return { answer: raw.answer, memoryIds, nothingFound: raw.nothingFound };
}

export interface AskDeps {
  /** Memories matching the words of the question, as this viewer may see them. */
  search(question: string, limit: number): Promise<AskMemory[]>;
  /** The newest memories this viewer may see. */
  newest(limit: number): Promise<AskMemory[]>;
  ask(messages: ChatMessage[]): Promise<Answer>;
}

/** Retrieval, the model, and the clean-up, with the viewer's own access already applied by `deps`. */
export async function answerQuestion(deps: AskDeps, i: { preferredName: string; pronoun: Pronoun; question: string }): Promise<Answer> {
  const question = i.question.trim().slice(0, 300);
  if (!question) return { answer: '', memoryIds: [], nothingFound: true };
  let memories = await deps.search(question, RETRIEVE_LIMIT);
  if (memories.length < MIN_HITS) {
    const seen = new Set(memories.map((m) => m.id));
    for (const m of await deps.newest(RETRIEVE_LIMIT)) if (!seen.has(m.id)) memories.push(m);
    memories = memories.slice(0, RETRIEVE_LIMIT * 2);
  }
  if (!memories.length) return { answer: NOTHING_FOUND(i.preferredName, i.pronoun), memoryIds: [], nothingFound: true };
  const raw = await deps.ask(buildAskPrompt({ ...i, question, memories }));
  return cleanAnswer(raw, memories.map((m) => m.id));
}
