import type { CoreDeps } from './talk';
import { RATE_PER_MIN } from './talk';
import { DEFAULT_MATCH, isValidEmbedding, matchFace } from './face-match';
import { buildRecognitionMessages } from './companion-prompt';
import { parseMoodTag } from './mood';
import { simpleRecognition, unsureMessage } from './messages';

export async function handleIdentify(deps: CoreDeps, input: { householdId: string; embedding: unknown }) {
  if (!isValidEmbedding(input.embedding)) return { status: 400, body: { error: 'bad embedding' } };
  const { householdId, embedding } = input;
  const now = deps.now();
  if (!(await deps.takeRateToken(householdId, 'identify', RATE_PER_MIN, 60))) {
    return { status: 429, body: { error: 'too many requests' } };
  }
  const [ctx, gallery] = await Promise.all([deps.loadContext(householdId, now), deps.faceGallery(householdId)]);
  const h = ctx.household;
  const result = matchFace(embedding, gallery, DEFAULT_MATCH);
  const person = result.status === 'match' ? ctx.people.find((p) => p.id === result.personId) : undefined;

  if (result.status !== 'match' || !person) {
    const reply = unsureMessage(h.language, h.primaryContactName);
    await deps.logEvent(householdId, 'face_query', { status: 'unsure', score: result.status === 'unsure' ? result.bestScore : null });
    return { status: 200, body: { status: 'unsure', reply } };
  }

  let reply: string;
  try {
    reply = parseMoodTag(await deps.chat(
      buildRecognitionMessages({ preferredName: h.preferredName, language: h.language, person }),
      { maxTokens: 120, temperature: 0.4 },
    )).reply;
    if (!reply) throw new Error('empty');
  } catch {
    reply = simpleRecognition(h.language, person.name, person.relation);
  }
  await deps.logEvent(householdId, 'face_query', { status: 'match', personId: person.id, name: person.name, score: result.score });
  return { status: 200, body: { status: 'match', name: person.name, relation: person.relation, reply } };
}
