export type SafetyCategory = 'pain' | 'fall' | 'lost' | 'fear' | 'emergency';

const RULES: { category: SafetyCategory; patterns: RegExp[] }[] = [
  { category: 'pain', patterns: [/\bpain(ful)?\b/i, /\bhurts?\b/i, /\bhurting\b/i, /\baches?\b/i, /दर्द/] },
  { category: 'fall', patterns: [/\bfell\b/i, /\bfallen\b/i, /\bfall(ing)? down\b/i, /\bslipped\b/i, /गिर/] },
  { category: 'lost', patterns: [/\blost\b/i, /\bwhere am i\b/i, /\bwant to go home\b/i, /\btake me home\b/i, /खो ग/, /मैं कहाँ हूँ/] },
  { category: 'fear', patterns: [/\bscared\b/i, /\bafraid\b/i, /\bfrightened\b/i, /डर/] },
  { category: 'emergency', patterns: [/\bhelp me\b/i, /\bcan'?t breathe\b/i, /\bbleeding\b/i, /\bchest pain\b/i] },
];

export function detectSafetyWords(text: string): SafetyCategory[] {
  return RULES.filter((r) => r.patterns.some((p) => p.test(text))).map((r) => r.category);
}
