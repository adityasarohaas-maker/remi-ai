export type SafetyCategory = 'pain' | 'fall' | 'lost' | 'fear' | 'emergency';

// Whole words in alphabetic scripts ("dor" must not match inside "dormir"); Chinese and Japanese
// have no spaces between words, so those are matched anywhere.
const words = (list: string[]) => new RegExp(String.raw`(?<![\p{L}\p{M}])(?:${list.join('|')})(?![\p{L}\p{M}])`, 'iu');
const anywhere = (list: string[]) => new RegExp(list.join('|'), 'u');

// English and Hindi were written first; the other languages need a native speaker's review.
const RULES: { category: SafetyCategory; patterns: RegExp[] }[] = [
  { category: 'pain', patterns: [
    /\bpain(ful)?\b/i, /\bhurts?\b/i, /\bhurting\b/i, /\baches?\b/i, /दर्द/,
    words(['dolor', 'me duele', "j'ai mal", 'douleur', 'schmerz', 'schmerzen', 'tut weh', 'dor', 'dói', 'ألم', 'يؤلمني', 'ব্যথা', 'வலி', 'నొప్పి', 'दुखतंय', 'वेदना', 'درد']),
    anywhere(['疼', '痛']),
  ] },
  { category: 'fall', patterns: [
    /\bfell\b/i, /\bfallen\b/i, /\bfall(ing)? down\b/i, /\bslipped\b/i, /गिर/,
    words(['me caí', 'me he caído', 'caí', 'je suis tombée?', 'gestürzt', 'hingefallen', 'umgefallen', 'levei um tombo', 'سقطت', 'وقعت', 'পড়ে গেছি', 'পড়ে গেলাম', 'விழுந்துட்டேன்', 'விழுந்தேன்', 'పడిపోయాను', 'पडलो', 'पडले', 'گر گیا', 'گر گئی']),
    anywhere(['摔倒', '摔了', '跌倒', '転んだ', '転倒']),
  ] },
  { category: 'lost', patterns: [
    /\blost\b/i, /\bwhere am i\b/i, /\bwant to go home\b/i, /\btake me home\b/i, /खो ग/, /मैं कहाँ हूँ/,
    words(['estoy perdid[oa]', 'dónde estoy', 'je suis perdue?', 'où suis-je', 'verlaufen', 'wo bin ich', 'estou perdid[oa]', 'onde estou', 'تائه', 'أين أنا', 'হারিয়ে গেছি', 'আমি কোথায়', 'நான் எங்கே', 'నేను ఎక్కడ', 'हरवलो', 'मी कुठे आहे', 'کھو گیا', 'میں کہاں ہوں']),
    anywhere(['迷路', '我在哪', '迷った', 'ここはどこ']),
  ] },
  { category: 'fear', patterns: [
    /\bscared\b/i, /\bafraid\b/i, /\bfrightened\b/i, /डर/,
    words(['miedo', "j'ai peur", 'angst', 'medo', 'خائف', 'ভয়', 'பயம்', 'భయం', 'भीती', 'ڈر']),
    anywhere(['害怕', '怖い']),
  ] },
  { category: 'emergency', patterns: [
    /\bhelp me\b/i, /\bcan'?t breathe\b/i, /\bbleeding\b/i, /\bchest pain\b/i,
    words(['socorro', 'ayúdame', 'au secours', 'aidez-moi', 'hilfe', 'me ajuda', 'النجدة', 'ساعدني', 'বাঁচাও', 'காப்பாத்துங்க', 'కాపాడండి', 'वाचवा', 'بچاؤ']),
    anywhere(['救命', '助けて']),
  ] },
];

export function detectSafetyWords(text: string): SafetyCategory[] {
  return RULES.filter((r) => r.patterns.some((p) => p.test(text))).map((r) => r.category);
}
