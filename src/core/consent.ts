// Her say over her own voice: asked once on the tablet, changeable any time by telling Remi.

export function consentQuestion(name: string): string {
  return `Before we begin, ${name}: may I keep your voice and your stories, so your family can hear them, now and later? You can tell me to stop keeping anything, any time.`;
}

const YES = /(?<![\p{L}\p{M}])(?:yes|yeah|yep|sure|of course|okay|ok|please do|you may|go ahead|haan|haa|han|ji|theek hai|zaroor|हाँ|हां|जी|ठीक है|ज़रूर)(?![\p{L}\p{M}])/iu;
const NO = /(?<![\p{L}\p{M}])(?:no|nope|don't|do not|never|rather not|nahi|nahin|mat|नहीं|नही|मत)(?![\p{L}\p{M}])/iu;

export function parseConsentAnswer(text: string): 'yes' | 'no' | 'unclear' {
  const yes = YES.test(text);
  const no = NO.test(text);
  if (yes && !no) return 'yes';
  if (no && !yes) return 'no';
  return 'unclear';
}

const STOP = /\b(?:stop|don't|do not|quit|no more)\b[^.?!]{0,40}\b(?:record|recording|keep|keeping|saving|save|remember)\b/i;
/** She is asking Remi to stop keeping her voice (or her words). */
export function wantsToStopRecording(text: string): boolean {
  return STOP.test(text) && /\b(?:me|my|what i|i say|this|voice|words)\b/i.test(text);
}

export const STOPPED_KEEPING = (name: string) => `Of course, ${name}. From now on I won't keep your voice or your words. If you ever change your mind, just tell me.`;
export const CONSENT_THANKS = (name: string) => `Thank you, ${name}. I'll keep them safe.`;
export const CONSENT_DECLINED = (name: string) => `That's alright, ${name}. I won't keep anything. We can still talk whenever you like.`;
