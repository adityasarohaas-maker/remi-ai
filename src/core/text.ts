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

// Some models now and then write their planning as the reply itself, with no <think> tags:
// "The user wants another story. I should…". Remi must never read that out.
const REASONING_START = new RegExp([
  String.raw`^(?:the )?user\b`,
  String.raw`^we (?:need|should|must|have to)\b`,
  String.raw`^ok(?:ay)?,? so\b`,
  String.raw`^let me (?:think|see|consider|craft|write|figure|plan|draft)\b`,
  String.raw`^let'?s (?:craft|draft|write|think|plan|compose|come up|figure|create a)\b`,
  String.raw`^i (?:should|need to|will|'ll|must) (?:tell|reply|respond|answer|write|craft|say|keep|make|use|give|start|mention|ask|include)\b`,
  String.raw`^[\p{L}]+ (?:is )?(?:asks|asked|asking|wants|wanted|requests|requested) (?:for|a|another)\b`,
].join('|'), 'iu');

/** The start of a reply that is really the model planning out loud, not talking to her. */
export function looksLikeReasoning(start: string): boolean {
  return REASONING_START.test(start.trim());
}

// (?=\s|$) instead of \b: JS \b does not treat Devanagari as word characters
const QUESTION_START = /^(what|when|where|who|why|how|is|are|am|can|will|did|do|does|kya|kab|kahan|kaun|kyun|kaise|क्या|कब|कहाँ|कौन|क्यों|कैसे)(?=\s|$)/i;
export const isQuestion = (s: string) => /[?？]\s*$/.test(s) || QUESTION_START.test(s.trim());
