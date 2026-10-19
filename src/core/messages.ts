// What Remi says without the model, in the family's language (see phrases.ts for the words).
import { phrasesFor } from './phrases';

export function fallbackReply(language: string): string {
  return phrasesFor(language).fallback;
}

export function unsureMessage(language: string, contact: string | null): string {
  return phrasesFor(language).unsure(contact);
}

export function noFaceMessage(language: string): string {
  return phrasesFor(language).noFace;
}

export function helpSentMessage(language: string, contact: string | null): string {
  return phrasesFor(language).helpSent(contact);
}

export function simpleRecognition(language: string, name: string, relation: string): string {
  return phrasesFor(language).recognition(name, relation);
}

// "What day is it?" is the question asked most. The clock can answer it even when the model can't.
const TIME_QUESTION = new RegExp([
  String.raw`what\s+(day|date|time)|which\s+day|today'?s\s+date`,
  String.raw`kya\s+din|kaun\s*sa\s+din|kitne\s+baje|kya\s+time|tar[ie]+kh|क्या\s+दिन|कौन\s*सा\s+दिन|तारीख|कितने\s+बजे|क्या\s+समय|क्या\s+टाइम`,
  String.raw`qu[ée]\s+d[ií]a|qu[ée]\s+hora|quel\s+jour|quelle\s+heure|welcher\s+tag|wie\s+sp[äa]t|que\s+dia|que\s+horas`,
  String.raw`أي\s+يوم|كم\s+الساعة|几点|星期几|今天几号|何曜日|何時`,
].join('|'), 'iu');

export function timeAnswer(text: string, now: { weekday: string; prettyDate: string; prettyTime: string }, language: string): string | null {
  if (!TIME_QUESTION.test(text)) return null;
  return phrasesFor(language).time(now.weekday, now.prettyDate, now.prettyTime);
}

export function wakeReply(language: string, name: string): string {
  return phrasesFor(language).wake(name);
}

export function wellDoneMessage(language: string, name: string): string {
  return phrasesFor(language).wellDone(name);
}
