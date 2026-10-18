type L = 'en' | 'hi';
const lang = (language: string): L => (language.toLowerCase().startsWith('hi') ? 'hi' : 'en');

export function fallbackReply(language: string): string {
  return lang(language) === 'hi'
    ? 'मैं यहीं आपके साथ हूँ। चलिए साथ में धीरे से साँस लेते हैं।'
    : "I'm right here with you. Let's take a slow breath together.";
}

export function unsureMessage(language: string, contact: string | null): string {
  return lang(language) === 'hi'
    ? `मुझे पक्का नहीं पता कि ये कौन हैं। क्या मैं ${contact ?? 'आपके परिवार'} से पूछूँ?`
    : `I'm not sure who this is. Shall I ask ${contact ?? 'your family'}?`;
}

export function noFaceMessage(language: string): string {
  return lang(language) === 'hi'
    ? 'मुझे चेहरा साफ़ नहीं दिख रहा। थोड़ा पास से फिर कोशिश करते हैं।'
    : "I can't see a face clearly. Let's try again, a little closer.";
}

export function helpSentMessage(language: string, contact: string | null): string {
  return lang(language) === 'hi'
    ? `मैंने ${contact ?? 'आपके परिवार'} को बता दिया है। जल्दी ही कोई आपसे बात करेगा।`
    : `I've told ${contact ?? 'your family'}. Someone will be in touch very soon.`;
}

export function simpleRecognition(language: string, name: string, relation: string): string {
  return lang(language) === 'hi' ? `ये ${name} हैं, आपके ${relation}।` : `This is ${name}, your ${relation}.`;
}
