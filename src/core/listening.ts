import { isQuestion } from './text';
import { phrasesFor } from './phrases';

// Hands-free Remi: the tablet hears everything, but only some of it is for Remi.
export const FOLLOW_UP_MS = 45_000;               // after Remi speaks, the conversation stays open this long
export const CHECK_IN_AFTER_MS = 2 * 60 * 60_000; // quiet this long in the day → Remi says hello
export const JOIN_IN_COOLDOWN_SECONDS = 60;       // Remi joins an overheard conversation at most this often

// Letters around the name mean it is part of another word ("premium"). \b would not work for Devanagari.
// The spellings are how speech recognition actually writes "Remi" (seen live: "Rami").
const NAME = String.raw`(?<![\p{L}\p{M}])(?:remi|remy|rémi|rémy|reemi|remmy|rami|ramy|rimi|rimmy|रेमी|रेमि|रमी|रामी|রেমি|ரெமி|రెమి|ریمی|ريمي|レミ|雷米|瑞米|蕾米)(?![\p{L}\p{M}])`;
const GREETING = String.raw`(?:(?:hey|hi|hello|okay|ok|oh|अरे|हे|सुनो)\s+)?`;
const WAKE = new RegExp(NAME, 'iu');
const WAKE_ALL = new RegExp(GREETING + NAME, 'giu');

export function stripWakeWord(text: string): string {
  return text.replace(WAKE_ALL, ' ').replace(/\s+/g, ' ').replace(/^[\s,.!?।]+/u, '').replace(/[\s,]+$/u, '');
}

// followup: said just after Remi spoke — maybe a reply to Remi, maybe to someone else in the room.
export type Heard = { kind: 'addressed' | 'followup' | 'overheard'; text: string } | { kind: 'wake' } | { kind: 'ignore' };

export function classifyHeard(raw: string, at: { nowMs: number; lastSpokeAtMs: number }): Heard {
  const text = raw.trim();
  if (!text) return { kind: 'ignore' };
  if (WAKE.test(text)) {
    const rest = stripWakeWord(text);
    return rest.replace(/[\s,.!?।]/gu, '') ? { kind: 'addressed', text: rest } : { kind: 'wake' };
  }
  if (at.nowMs - at.lastSpokeAtMs < FOLLOW_UP_MS) return { kind: 'followup', text };
  return { kind: 'overheard', text };
}

const word = (w: string) => new RegExp(String.raw`(?<![\p{L}\p{M}])(?:${w})(?![\p{L}\p{M}])`, 'iu');
const NOT_DONE = word([
  'not', 'no', 'nope', 'nahi', 'nahin', 'नहीं', 'ना', 'non', 'nein', 'não', 'nao', 'todavía no', 'pas encore',
  'لا', 'いいえ', 'まだ', '没有', '还没', 'না', 'இல்லை', 'లేదు', 'نہیں', 'नाही',
].join('|'));
const DONE = word([
  'done', 'yes', 'yeah', 'yep', 'taken', 'took', 'finished', 'ok', 'okay', 'had it', 'ate',
  'haan', 'han', 'ho gaya', 'ho gya', 'kar liya', 'le li', 'le liya', 'kha liya',
  'हाँ', 'हां', 'हो गया', 'ले ली', 'ले लिया', 'खा लिया', 'कर लिया', 'हो', 'झालं', 'झाले',
  'sí', 'si', 'listo', 'lista', 'hecho', 'ya', 'oui', 'fait', 'fini', "c'est fait", 'ja', 'fertig', 'erledigt',
  'sim', 'pronto', 'feito', 'já', 'نعم', 'تم', 'خلاص', 'はい', 'できた', '終わった', '好了', '是的', '做完了',
  'হ্যাঁ', 'হয়ে গেছে', 'ஆமாம்', 'முடிந்தது', 'అవును', 'అయిపోయింది', 'ہاں', 'جی', 'ہو گیا',
].join('|'));

// Barge-in: the microphone stays on while Remi speaks, so it hears Remi through the speaker. Words
// Remi is saying are echo; words Remi isn't saying are her, talking over Remi.
const STOP = word([
  'stop', 'wait', 'hold on', 'enough', 'quiet', 'shush', 'ruko', 'ruk', 'bas', 'chup', 'रुको', 'रुकिए', 'बस', 'चुप',
  'para', 'espera', 'basta', 'arrête', 'attends', 'stopp', 'warte', 'halt', 'pare', 'espere', 'توقف', 'انتظر', 'كفى',
  'থামো', 'நிறுத்து', 'ఆపు', 'رکو', 'بس', 'थांब',
].join('|'));
const STOP_CJK = /停|等等|别说了|待って|止めて|ストップ/u;
const NAME_RE = new RegExp(NAME, 'iu');

const tokens = (s: string) =>
  s.toLowerCase().match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[\p{L}\p{M}\p{N}]+/gu) ?? [];

function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3 || Math.abs(a.length - b.length) > 2) return false;
  const max = a.length >= 7 ? 2 : 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (Math.min(...row) > max) return false;
    prev = row;
  }
  return prev[b.length] <= max;
}

/** Heard words that Remi is not saying (allowing for the microphone mishearing a word or two). */
function foreignWords(heard: string, spoken: string): { foreign: string[]; total: number } {
  const said = tokens(spoken);
  const exact = new Set(said);
  const words = tokens(heard);
  return { foreign: words.filter((w) => !exact.has(w) && !said.some((s) => near(w, s))), total: words.length };
}

/** What the microphone heard is just Remi's own voice coming back. */
export function isEcho(heard: string, spoken: string): boolean {
  const { foreign, total } = foreignWords(heard, spoken);
  return total > 0 && foreign.length <= Math.max(1, Math.floor(total * 0.2));
}

/** She is talking over Remi: a stop word or Remi's name, or words of her own. */
export function isBargeIn(heard: string, spoken: string): boolean {
  const { foreign, total } = foreignWords(heard, spoken);
  const own = foreign.join(' ');
  if (STOP.test(own) || NAME_RE.test(own) || (STOP_CJK.test(heard) && !STOP_CJK.test(spoken))) return true;
  return foreign.length >= 3 || (foreign.length >= 2 && foreign.length / total >= 0.5);
}

/** Only "stop" / "wait" (maybe with Remi's name): she wants quiet, not an answer. */
export function isStopOnly(text: string): boolean {
  const rest = tokens(text.replace(new RegExp(NAME, 'giu'), ''));
  return rest.length <= 3 && (STOP.test(text) || STOP_CJK.test(text));
}

/** A reply to a spoken reminder that means it has been done. */
export function isDoneReply(text: string): boolean {
  if (/[?？]\s*$/.test(text) || NOT_DONE.test(text)) return false;
  return DONE.test(text);
}

export function inQuietHours(minutesOfDay: number): boolean {
  return minutesOfDay >= 21 * 60 || minutesOfDay < 7 * 60;
}

export function shouldCheckIn(s: { nowMs: number; lastActivityMs: number; lastCheckInMs: number; minutesOfDay: number; afterMs?: number }): boolean {
  const after = s.afterMs ?? CHECK_IN_AFTER_MS;
  return !inQuietHours(s.minutesOfDay) && s.nowMs - s.lastActivityMs >= after && s.nowMs - s.lastCheckInMs >= after;
}

type CheckInPerson = { name: string; relation: string; isDeceased: boolean };

export function checkInLine(language: string, name: string, people: CheckInPerson[], seed: number): string {
  const living = people.filter((p) => !p.isDeceased);
  const p = living.length ? living[seed % living.length] : null;
  const lines = phrasesFor(language).checkIns(name, p);
  return lines[seed % lines.length];
}

const CONFUSION = word([
  'where am i', 'go home', 'want to go home', "i'm lost", 'i am lost', "i'm confused", 'i am confused', 'who are you',
  'kahan hoon', 'kahan hu', 'ghar jana', 'कहाँ हूँ', 'कहां हूं', 'घर जाना',
].join('|'));
const HINDI_QUESTION = word('kya|kab|kahan|kaun|kyun|kaise|kitne|क्या|कब|कहाँ|कौन|क्यों|कैसे|कितने');

/** Overheard speech Remi might help with: questions, family names, or signs of confusion. */
export function worthJoining(text: string, names: string[]): boolean {
  if (isQuestion(text) || HINDI_QUESTION.test(text) || CONFUSION.test(text)) return true;
  return names.some((n) => n.trim() && word(n.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(text));
}

const COMMANDS: [RegExp, 'face' | 'today' | 'home'][] = [
  [/^(?:who\s+is\s+(?:this|that|here)(?:\s+person)?|who'?s\s+(?:this|that)|ye\s+kaun\s+hai|yeh\s+kaun\s+hai|ये\s+कौन\s+है|यह\s+कौन\s+है)[\s?!.।]*$/iu, 'face'],
  [/^(?:(?:what'?s|what\s+is|show(?:\s+me)?|tell\s+me)\s+my\s+day|my\s+day|what\s+do\s+i\s+have\s+today|what'?s\s+on\s+today|mera\s+din|मेरा\s+दिन|आज\s+क्या\s+करना\s+है)[\s?!.।]*$/iu, 'today'],
  [/^(?:go\s+back|back|home|go\s+home\s+screen|वापस|vapas|wapas)[\s?!.।]*$/iu, 'home'],
];

/** Spoken shortcuts to the tablet's screens. Anything else is conversation. */
export function voiceCommand(text: string): 'face' | 'today' | 'home' | null {
  const t = text.trim();
  return COMMANDS.find(([re]) => re.test(t))?.[1] ?? null;
}
