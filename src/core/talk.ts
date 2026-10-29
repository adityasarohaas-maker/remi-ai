import type { HouseholdContext } from './types';
import type { ChatMessage } from '@/lib/claude';
import type { AlertReason } from '@/lib/alerts';
import type { FaceSample } from './face-match';

/** purpose 'story': a model that tells stories well (the everyday model is picked for speed). */
export type ChatOpts = { maxTokens: number; effort?: 'low' | 'medium' | 'high'; purpose?: 'story' };
import { localParts } from './time';
import { reminderStates } from './reminders';
import { detectSafetyWords } from './safety';
import { findSensitiveGuidance } from './sensitive';
import { parseMoodTag, extractTellFamily, extractAsked, type Mood } from './mood';
import { pickSteer } from './story-steer';
import { wantsToStopRecording, STOPPED_KEEPING } from './consent';
import { detectCareSignals, CARE_ALERTS_PER_KIND, CARE_ALERT_WINDOW_SECONDS, CARE_LABEL, type CareKind } from './care-signals';
import { buildCompanionPrompt, languageName, wantsStory, opensWishes } from './companion-prompt';
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
  chat(messages: ChatMessage[], opts: ChatOpts): Promise<string>;
  /** Same as chat, but calls onDelta with each piece of text as it arrives; resolves to the full text. */
  chatStream?(messages: ChatMessage[], opts: ChatOpts, onDelta: (text: string) => void): Promise<string>;
  logEvent(householdId: string, type: string, payload: Record<string, unknown>): Promise<void>;
  alert(householdId: string, reason: AlertReason, detail: string): Promise<void>;
  faceGallery(householdId: string): Promise<FaceSample[]>;
  /** Remi raised this family question in conversation. */
  markQuestionAsked(questionId: string): Promise<void>;
  /** She told Remi to stop (or start again) keeping her voice. */
  setRecordVoice(householdId: string, on: boolean): Promise<void>;
  /** Something worth the family's or the care team's attention, kept for the Today page. */
  logCareSignal(householdId: string, kind: CareKind, detail: string): Promise<void>;
}

export type TalkMode = 'addressed' | 'followup' | 'overheard';

export async function handleTalk(deps: CoreDeps, input: {
  householdId: string; text: string; clientKey?: string; mode?: TalkMode;
  /** Stream the model's words to the tablet so Remi can start speaking after the first sentence. */
  onDelta?: (text: string) => void;
  /** The language picked on the tablet; the family's profile language when absent or unsupported. */
  language?: string;
  /** The clip of her words for this turn, named by the tablet before it uploads it. */
  recordingId?: string;
  /** The old photo on screen while she spoke. */
  photo?: { id: string; note: string | null };
  /** Who Remi had just recognised (the photo, or the Who-is-this screen). */
  personName?: string;
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

  // Her say over her own voice comes before anything else, and needs no model.
  if (input.mode !== 'overheard' && !safety.length && wantsToStopRecording(text)) {
    await Promise.allSettled([deps.setRecordVoice(householdId, false), deps.alert(householdId, 'message', `${h.preferredName} asked Remi to stop keeping her voice and her words.`)]);
    const reply = STOPPED_KEEPING(h.preferredName);
    await deps.logEvent(householdId, 'consent', { answer: 'no', said: text });
    return { status: 200, body: { reply, mood: 'unknown' as Mood, alerted: true } };
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

  // Signs worth a look, short of an emergency: noted for the family, Remi asks one gentle follow-up.
  const recentHistory = await historyP;
  const confusedLately = recentHistory.filter((t) => t.mood === 'confused').length + (/\b(?:where am i|what day|who are you)\b/i.test(text) ? 1 : 0);
  // Safety words already alerted above; care signals are still noted for the Today page, but alert only on their own.
  const care = detectCareSignals(text, 'unknown', confusedLately);
  for (const kind of care) {
    alerts.push(deps.logCareSignal(householdId, kind, text));
    if (!safety.length && await deps.takeRateToken(householdId, `care:${kind}`, CARE_ALERTS_PER_KIND, CARE_ALERT_WINDOW_SECONDS)) {
      alerts.push(deps.alert(householdId, 'care', `${CARE_LABEL[kind]}. ${h.preferredName} said: "${text}"`));
    }
  }

  const story = wantsStory(text) && !safety.length;
  // what she wants after she is gone: only ever her subject, and nothing else is raised while she is on it
  const wishesOpen = !overheard && (opensWishes(text) || recentHistory.slice(-2).some((t) => opensWishes(t.text)));
  // overheard chatter is never the moment to bring something up
  // she is looking at a photo right now: that is what to talk about, whatever Remi raised earlier
  const steer = input.photo ? { kind: 'photo' as const, id: input.photo.id, note: input.photo.note } : overheard ? null : pickSteer({
    careType: ctx.careType, pendingQuestions: ctx.pendingQuestions, unshownPhoto: ctx.unshownPhoto, storyCoverage: ctx.storyCoverage,
    minutesSinceLastSteer: ctx.lastSteerAt ? (now.getTime() - ctx.lastSteerAt.getTime()) / 60_000 : Infinity,
  });
  const system = buildCompanionPrompt({
    preferredName: h.preferredName, language, about: h.about,
    now: local, people: ctx.people,
    routine: reminderStates(ctx.routine, ctx.doneIds, local.minutes),
    primaryContactName: h.primaryContactName, sensitive, safety, heardAs: input.mode === 'addressed' ? undefined : input.mode, story,
    careType: ctx.careType, steer: wishesOpen ? null : steer, care, wishesOpen,
  });
  const history = recentHistory.slice(-6);
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
  let askedQuestion: string | null = null;
  try {
    // a story gets the storyteller model and room to tell it; the prompt keeps everyday replies short
    const opts: ChatOpts = story ? { maxTokens: 700, effort: 'medium', purpose: 'story' } : { maxTokens: 400, effort: 'low' };
    const raw = input.onDelta && deps.chatStream
      ? await deps.chatStream(messages, opts, input.onDelta)
      : await deps.chat(messages, opts);
    ({ reply, mood } = parseMoodTag(raw));
    const told = extractTellFamily(reply);
    const asked = extractAsked(told.reply);
    reply = asked.reply;
    if (asked.questionId && ctx.pendingQuestions.some((q) => q.id === asked.questionId)) {
      askedQuestion = asked.questionId;
      alerts.push(deps.markQuestionAsked(askedQuestion));
    }
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

  if (mood === 'confused' && !care.includes('confusion') && detectCareSignals('', mood, confusedLately + 1).includes('confusion')) {
    alerts.push(deps.logCareSignal(householdId, 'confusion', text));
  }
  await Promise.allSettled(alerts);
  if (reply === null) return { ...silent, body: { reply: null, alerted: alerts.length > 0 } };
  await deps.logEvent(householdId, 'conversation', { text, reply, mood, safety, sensitiveTopic: sensitive?.topic ?? null, fallback, mode: input.mode ?? 'addressed', toldFamily, recordingId: input.recordingId ?? null,
    // what Remi brought up this turn, so it isn't brought up again too soon
    steer: askedQuestion ? 'question' : steer && !fallback ? steer.kind : null, askedQuestion,
    photoId: input.photo?.id ?? null, personName: input.personName ?? null, care });
  return { status: 200, body: { reply, mood, alerted: safety.length > 0 || alerts.length > 0 } };
}
