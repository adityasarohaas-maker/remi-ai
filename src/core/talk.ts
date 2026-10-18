import type { HouseholdContext } from './types';
import type { ChatMessage } from '@/lib/nebius';
import type { AlertReason } from '@/lib/alerts';
import type { FaceSample } from './face-match';
import { localParts } from './time';
import { reminderStates } from './reminders';
import { detectSafetyWords } from './safety';
import { findSensitiveGuidance } from './sensitive';
import { parseMoodTag, type Mood } from './mood';
import { buildCompanionPrompt } from './companion-prompt';
import { fallbackReply, helpSentMessage, timeAnswer } from './messages';
import { worthJoining, JOIN_IN_COOLDOWN_SECONDS } from './listening';

export const MAX_INPUT = 500;
export const RATE_PER_MIN = 20;         // model calls per household per minute
export const CLIENT_RATE_PER_MIN = 12;  // per caller IP — the demo tablet link is public
export const SAFETY_ALERTS_PER_MIN = 3; // repeated distress in one minute is one alert, not ten

export interface CoreDeps {
  now(): Date;
  loadContext(householdId: string, now: Date): Promise<HouseholdContext>;
  recentTurns(householdId: string, since: Date): Promise<{ text: string; reply: string }[]>;
  /** Atomically takes one token from a fixed window; false when the window is full. */
  takeRateToken(householdId: string, bucket: string, limit: number, windowSeconds: number): Promise<boolean>;
  chat(messages: ChatMessage[], opts: { maxTokens: number; temperature: number }): Promise<string>;
  logEvent(householdId: string, type: string, payload: Record<string, unknown>): Promise<void>;
  alert(householdId: string, reason: AlertReason, detail: string): Promise<void>;
  faceGallery(householdId: string): Promise<FaceSample[]>;
}

export type TalkMode = 'addressed' | 'followup' | 'overheard';

export async function handleTalk(deps: CoreDeps, input: { householdId: string; text: string; clientKey?: string; mode?: TalkMode }) {
  const text = input.text.trim().slice(0, MAX_INPUT);
  if (!text) return { status: 400, body: { error: 'empty' } };
  const now = deps.now();
  const { householdId } = input;
  const ctx = await deps.loadContext(householdId, now);
  const h = ctx.household;

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

  const allowed = (await deps.takeRateToken(householdId, 'talk', RATE_PER_MIN, 60))
    && (!input.clientKey || (await deps.takeRateToken(householdId, `talk-client:${input.clientKey}`, CLIENT_RATE_PER_MIN, 60)));
  if (!allowed) {
    await Promise.allSettled(alerts);
    const busyReply = safety.length ? helpSentMessage(h.language, h.primaryContactName) : maySkip ? null : fallbackReply(h.language);
    return { status: 429, body: { error: 'too many requests', reply: busyReply, alerted: safety.length > 0 } };
  }

  const local = localParts(now, h.timezone);
  if (sensitive?.approach === 'call_relative') {
    alerts.push(deps.alert(householdId, 'call_request', `${h.preferredName} is asking about ${sensitive.topic}. Please call ${sensitive.callPersonName ?? h.primaryContactName ?? 'them'} now.`));
  }

  const system = buildCompanionPrompt({
    preferredName: h.preferredName, language: h.language, about: h.about,
    now: local, people: ctx.people,
    routine: reminderStates(ctx.routine, ctx.doneIds, local.minutes),
    primaryContactName: h.primaryContactName, sensitive, safety, heardAs: input.mode === 'addressed' ? undefined : input.mode,
  });
  const history = (await deps.recentTurns(householdId, new Date(now.getTime() - 30 * 60_000))).slice(-6);
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    ...history.flatMap((t): ChatMessage[] => [{ role: 'user', content: t.text }, { role: 'assistant', content: t.reply }]),
    { role: 'user', content: text },
  ];

  let reply: string | null = '';
  let mood: Mood = 'unknown';
  let fallback = false;
  try {
    ({ reply, mood } = parseMoodTag(await deps.chat(messages, { maxTokens: 300, temperature: 0.4 })));
    if (!reply) throw new Error('empty reply');
    if (maySkip && !safety.length && /^\s*SKIP\b/i.test(reply)) reply = null;
  } catch {
    // Without the model: safety first, then the family's own words, then the clock, then a calm sentence
    // (or silence, if it may not have been said to Remi).
    reply = safety.length ? helpSentMessage(h.language, h.primaryContactName)
      : sensitive?.familyScript || timeAnswer(text, local, h.language) || (maySkip ? null : fallbackReply(h.language));
    fallback = true;
  }

  await Promise.allSettled(alerts);
  if (reply === null) return { ...silent, body: { reply: null, alerted: alerts.length > 0 } };
  await deps.logEvent(householdId, 'conversation', { text, reply, mood, safety, sensitiveTopic: sensitive?.topic ?? null, fallback, mode: input.mode ?? 'addressed' });
  return { status: 200, body: { reply, mood, alerted: safety.length > 0 || alerts.length > 0 } };
}
