import type { HouseholdContext } from './types';
import type { ChatMessage } from '@/lib/nebius';
import type { AlertReason } from '@/lib/alerts';
import type { FaceSample } from './face-match';
import { localParts } from './time';
import { reminderStates } from './reminders';
import { detectSafetyWords } from './safety';
import { findSensitiveGuidance } from './sensitive';
import { parseMoodTag, extractTellFamily, type Mood } from './mood';
import { buildCompanionPrompt, languageName } from './companion-prompt';
import { fallbackReply, helpSentMessage, timeAnswer } from './messages';
import { worthJoining, JOIN_IN_COOLDOWN_SECONDS } from './listening';
import { isSupportedLanguage } from './voices';

export const MAX_INPUT = 500;
export const RATE_PER_MIN = 20;         // model calls per household per minute
export const CLIENT_RATE_PER_MIN = 12;  // per caller IP — the demo tablet link is public
export const SAFETY_ALERTS_PER_MIN = 3; // repeated distress in one minute is one alert, not ten
export const TELL_FAMILY_PER_10_MIN = 3; // messages Remi passes on to the family

export interface CoreDeps {
  now(): Date;
  loadContext(householdId: string, now: Date): Promise<HouseholdContext>;
  /** The latest turns since `since`, oldest first. */
  recentTurns(householdId: string, since: Date): Promise<{ text: string; reply: string; mood?: string }[]>;
  /** Atomically takes one token from a fixed window; false when the window is full. */
  takeRateToken(householdId: string, bucket: string, limit: number, windowSeconds: number): Promise<boolean>;
  chat(messages: ChatMessage[], opts: { maxTokens: number; temperature: number }): Promise<string>;
  /** Same as chat, but calls onDelta with each piece of text as it arrives; resolves to the full text. */
  chatStream?(messages: ChatMessage[], opts: { maxTokens: number; temperature: number }, onDelta: (text: string) => void): Promise<string>;
  logEvent(householdId: string, type: string, payload: Record<string, unknown>): Promise<void>;
  alert(householdId: string, reason: AlertReason, detail: string): Promise<void>;
  faceGallery(householdId: string): Promise<FaceSample[]>;
}

export type TalkMode = 'addressed' | 'followup' | 'overheard';

export async function handleTalk(deps: CoreDeps, input: {
  householdId: string; text: string; clientKey?: string; mode?: TalkMode;
  /** Stream the model's words to the tablet so Remi can start speaking after the first sentence. */
  onDelta?: (text: string) => void;
  /** The language picked on the tablet; the family's profile language when absent or unsupported. */
  language?: string;
}) {
  const text = input.text.trim().slice(0, MAX_INPUT);
  if (!text) return { status: 400, body: { error: 'empty' } };
  const now = deps.now();
  const { householdId } = input;
  // Independent reads go out together: every round-trip here is time before Remi can speak.
  const historyP = deps.recentTurns(householdId, new Date(now.getTime() - 30 * 60_000));
  historyP.catch(() => {}); // awaited later; never an unhandled rejection if we return early
  const ctx = await deps.loadContext(householdId, now);
  const h = ctx.household;
  // People with dementia often go back to their first language: answer Hindi in Hindi, whatever the household
  // default. Families whose own language is written in Devanagari (Hindi, Marathi, Nepali) keep their language.
  const chosen = input.language && isSupportedLanguage(input.language) ? input.language : h.language;
  const language = /[ऀ-ॿ]/.test(text) && !/^(hi|mr|ne)/i.test(chosen) ? 'hi-IN' : chosen;

  // Safety comes before any rate limit: a fall must reach the family even when the tablet is busy.
  const safety = detectSafetyWords(text);
  const alerts: Promise<void>[] = [];
  if (safety.length && (await deps.takeRateToken(householdId, 'safety-alert', SAFETY_ALERTS_PER_MIN, 60))) {
    alerts.push(deps.alert(householdId, 'safety', `${h.preferredName} said: "${text}" (${safety.join(', ')})`));
  }

  // Overheard speech: Remi stays out of ordinary chatter, joins in rarely, and never saves what it ignores.
  const overheard = input.mode === 'overheard';
  const maySkip = overheard || input.mode === 'followup'; // not certainly said to Remi: silence is allowed
  const sensitive = findSensitiveGuidance(text, ctx.guidance);
  const silent = { status: 200, body: { reply: null, alerted: false } };
  if (overheard && !safety.length) {
    if (!sensitive && !worthJoining(text, ctx.people.map((p) => p.name))) return silent;
    if (!(await deps.takeRateToken(householdId, 'join-in', 1, JOIN_IN_COOLDOWN_SECONDS))) return silent;
  }

  const [householdOk, clientOk] = await Promise.all([
    deps.takeRateToken(householdId, 'talk', RATE_PER_MIN, 60),
    input.clientKey ? deps.takeRateToken(householdId, `talk-client:${input.clientKey}`, CLIENT_RATE_PER_MIN, 60) : true,
  ]);
  const allowed = householdOk && clientOk;
  if (!allowed) {
    await Promise.allSettled(alerts);
    const busyReply = safety.length ? helpSentMessage(language, h.primaryContactName) : maySkip ? null : fallbackReply(language);
    return { status: 429, body: { error: 'too many requests', reply: busyReply, alerted: safety.length > 0 } };
  }

  const local = localParts(now, h.timezone, language); // weekday and date in her language
  if (sensitive?.approach === 'call_relative') {
    alerts.push(deps.alert(householdId, 'call_request', `${h.preferredName} is asking about ${sensitive.topic}. Please call ${sensitive.callPersonName ?? h.primaryContactName ?? 'them'} now.`));
  }

  const system = buildCompanionPrompt({
    preferredName: h.preferredName, language, about: h.about,
    now: local, people: ctx.people,
    routine: reminderStates(ctx.routine, ctx.doneIds, local.minutes),
    primaryContactName: h.primaryContactName, sensitive, safety, heardAs: input.mode === 'addressed' ? undefined : input.mode,
  });
  const history = (await historyP).slice(-6);
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    // Earlier replies keep their MOOD line: without it the model copies the history and stops writing one.
    ...history.flatMap((t): ChatMessage[] => [
      { role: 'user', content: t.text },
      { role: 'assistant', content: t.mood && t.mood !== 'unknown' ? `${t.reply}\nMOOD: ${t.mood}` : t.reply },
    ]),
    // An English history outweighs the system prompt; a note on her own message does not get lost.
    { role: 'user', content: language === h.language ? text : `${text}\n\n(Reply in ${languageName(language)}.)` },
  ];

  let reply: string | null = '';
  let mood: Mood = 'unknown';
  let fallback = false;
  let toldFamily: string | null = null;
  try {
    // room for a story when she asks for one; the prompt keeps everyday replies short
    const opts = { maxTokens: 400, temperature: 0.6 };
    const raw = input.onDelta && deps.chatStream
      ? await deps.chatStream(messages, opts, input.onDelta)
      : await deps.chat(messages, opts);
    ({ reply, mood } = parseMoodTag(raw));
    const told = extractTellFamily(reply);
    reply = told.reply;
    if (!reply) throw new Error('empty reply');
    if (told.message && (await deps.takeRateToken(householdId, 'tell-family', TELL_FAMILY_PER_10_MIN, 600))) {
      toldFamily = told.message;
      alerts.push(deps.alert(householdId, 'message', told.message));
    }
    if (maySkip && !safety.length && /^\s*SKIP\b/i.test(reply)) reply = null;
  } catch {
    // Without the model: safety first, then the family's own words, then the clock, then a calm sentence
    // (or silence, if it may not have been said to Remi).
    reply = safety.length ? helpSentMessage(language, h.primaryContactName)
      : sensitive?.familyScript || timeAnswer(text, local, language) || (maySkip ? null : fallbackReply(language));
    fallback = true;
  }

  await Promise.allSettled(alerts);
  if (reply === null) return { ...silent, body: { reply: null, alerted: alerts.length > 0 } };
  await deps.logEvent(householdId, 'conversation', { text, reply, mood, safety, sensitiveTopic: sensitive?.topic ?? null, fallback, mode: input.mode ?? 'addressed', toldFamily });
  return { status: 200, body: { reply, mood, alerted: safety.length > 0 || alerts.length > 0 } };
}
