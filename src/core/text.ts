// Reasoning models may put their thinking in the reply. Never let any of it reach the patient:
// drop complete <think> blocks, anything before a stray </think>, and anything after an
// unclosed <think> (a reply cut off by max_tokens mid-thought).
export function stripReasoning(s: string): string {
  const withoutPairs = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const close = withoutPairs.toLowerCase().lastIndexOf('</think>');
  const afterClose = close >= 0 ? withoutPairs.slice(close + '</think>'.length) : withoutPairs;
  const open = afterClose.toLowerCase().indexOf('<think>');
  return (open >= 0 ? afterClose.slice(0, open) : afterClose).trim();
}

// (?=\s|$) instead of \b: JS \b does not treat Devanagari as word characters
const QUESTION_START = /^(what|when|where|who|why|how|is|are|am|can|will|did|do|does|kya|kab|kahan|kaun|kyun|kaise|क्या|कब|कहाँ|कौन|क्यों|कैसे)(?=\s|$)/i;
export const isQuestion = (s: string) => /[?？]\s*$/.test(s) || QUESTION_START.test(s.trim());
