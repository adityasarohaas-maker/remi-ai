import { isQuestion } from './text';

// Hands-free Remi: the tablet hears everything, but only some of it is for Remi.
export const FOLLOW_UP_MS = 45_000;               // after Remi speaks, the conversation stays open this long
export const CHECK_IN_AFTER_MS = 2 * 60 * 60_000; // quiet this long in the day → Remi says hello
export const JOIN_IN_COOLDOWN_SECONDS = 60;       // Remi joins an overheard conversation at most this often

// Letters around the name mean it is part of another word ("premium"). \b would not work for Devanagari.
// The spellings are how speech recognition actually writes "Remi" (seen live: "Rami").
const NAME = String.raw`(?<![\p{L}\p{M}])(?:remi|remy|rémi|rémy|reemi|remmy|rami|ramy|rimi|rimmy|रेमी|रेमि|रमी|रामी)(?![\p{L}\p{M}])`;
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
const NOT_DONE = word('not|no|nope|nahi|nahin|नहीं|ना');
const DONE = word([
  'done', 'yes', 'yeah', 'yep', 'taken', 'took', 'finished', 'ok', 'okay', 'had it', 'ate',
  'haan', 'han', 'ho gaya', 'ho gya', 'kar liya', 'le li', 'le liya', 'kha liya',
  'हाँ', 'हां', 'हो गया', 'ले ली', 'ले लिया', 'खा लिया', 'कर लिया',
].join('|'));

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
  const hi = language.toLowerCase().startsWith('hi');
  const lines = hi
    ? [
        `नमस्ते ${name}। मैं आपके साथ हूँ। आपका मन कैसा है?`,
        p ? `${name}, क्या आप मुझे ${p.name} के बारे में कुछ बताएँगे?` : `${name}, क्या आप मुझे अपने दिन के बारे में बताएँगे?`,
        `${name}, चलिए साथ में एक गिलास पानी पीते हैं।`,
        `${name}, चलिए साथ में धीरे से एक लंबी साँस लेते हैं।`,
      ]
    : [
        `Hello ${name}. I'm here with you. How are you feeling?`,
        p ? `${name}, would you like to tell me about ${p.name}, your ${p.relation}?` : `${name}, would you like to tell me about your day?`,
        `${name}, shall we have a glass of water together?`,
        `${name}, let's take a slow, easy breath together.`,
      ];
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
