// Remi speaks to families anywhere in the world. Each language gets a soft, natural female voice
// (Azure neural voices); an unknown locale falls back to its language family, then US English.

/** Languages a family can choose for Remi, named in their own language. */
export const LANGUAGES = [
  { code: 'en-US', name: 'English (US)', voice: 'en-US-JennyNeural' },
  { code: 'en-GB', name: 'English (UK)', voice: 'en-GB-SoniaNeural' },
  { code: 'en-IN', name: 'English (India)', voice: 'en-IN-NeerjaNeural' },
  { code: 'en-AU', name: 'English (Australia)', voice: 'en-AU-NatashaNeural' },
  { code: 'en-CA', name: 'English (Canada)', voice: 'en-CA-ClaraNeural' },
  { code: 'hi-IN', name: 'हिन्दी', voice: 'hi-IN-SwaraNeural' },
  { code: 'bn-IN', name: 'বাংলা', voice: 'bn-IN-TanishaaNeural' },
  { code: 'ta-IN', name: 'தமிழ்', voice: 'ta-IN-PallaviNeural' },
  { code: 'te-IN', name: 'తెలుగు', voice: 'te-IN-ShrutiNeural' },
  { code: 'mr-IN', name: 'मराठी', voice: 'mr-IN-AarohiNeural' },
  { code: 'gu-IN', name: 'ગુજરાતી', voice: 'gu-IN-DhwaniNeural' },
  { code: 'kn-IN', name: 'ಕನ್ನಡ', voice: 'kn-IN-SapnaNeural' },
  { code: 'ml-IN', name: 'മലയാളം', voice: 'ml-IN-SobhanaNeural' },
  { code: 'pa-IN', name: 'ਪੰਜਾਬੀ', voice: 'pa-IN-VaaniNeural' },
  { code: 'ur-PK', name: 'اردو', voice: 'ur-PK-UzmaNeural' },
  { code: 'es-ES', name: 'Español (España)', voice: 'es-ES-ElviraNeural' },
  { code: 'es-MX', name: 'Español (México)', voice: 'es-MX-DaliaNeural' },
  { code: 'fr-FR', name: 'Français', voice: 'fr-FR-DeniseNeural' },
  { code: 'fr-CA', name: 'Français (Canada)', voice: 'fr-CA-SylvieNeural' },
  { code: 'de-DE', name: 'Deutsch', voice: 'de-DE-KatjaNeural' },
  { code: 'it-IT', name: 'Italiano', voice: 'it-IT-ElsaNeural' },
  { code: 'pt-BR', name: 'Português (Brasil)', voice: 'pt-BR-FranciscaNeural' },
  { code: 'pt-PT', name: 'Português (Portugal)', voice: 'pt-PT-RaquelNeural' },
  { code: 'nl-NL', name: 'Nederlands', voice: 'nl-NL-ColetteNeural' },
  { code: 'pl-PL', name: 'Polski', voice: 'pl-PL-ZofiaNeural' },
  { code: 'ru-RU', name: 'Русский', voice: 'ru-RU-SvetlanaNeural' },
  { code: 'tr-TR', name: 'Türkçe', voice: 'tr-TR-EmelNeural' },
  { code: 'ar-SA', name: 'العربية', voice: 'ar-SA-ZariyahNeural' },
  { code: 'he-IL', name: 'עברית', voice: 'he-IL-HilaNeural' },
  { code: 'zh-CN', name: '中文', voice: 'zh-CN-XiaoxiaoNeural' },
  { code: 'ja-JP', name: '日本語', voice: 'ja-JP-NanamiNeural' },
  { code: 'ko-KR', name: '한국어', voice: 'ko-KR-SunHiNeural' },
  { code: 'id-ID', name: 'Bahasa Indonesia', voice: 'id-ID-GadisNeural' },
  { code: 'fil-PH', name: 'Filipino', voice: 'fil-PH-BlessicaNeural' },
  { code: 'vi-VN', name: 'Tiếng Việt', voice: 'vi-VN-HoaiMyNeural' },
  { code: 'th-TH', name: 'ไทย', voice: 'th-TH-PremwadeeNeural' },
  { code: 'sw-KE', name: 'Kiswahili', voice: 'sw-KE-ZuriNeural' },
] as const;

const DEFAULT_VOICE = 'en-US-JennyNeural';
// When a family's exact locale has no voice, the language's main voice stands in.
const FAMILY: Record<string, string> = { en: 'en-US-JennyNeural', es: 'es-ES-ElviraNeural', fr: 'fr-FR-DeniseNeural', pt: 'pt-BR-FranciscaNeural', ar: 'ar-SA-ZariyahNeural', zh: 'zh-CN-XiaoxiaoNeural' };

export function isSupportedLanguage(code: string): boolean {
  return LANGUAGES.some((l) => l.code === code);
}

export function cloudVoiceFor(locale: string): string {
  const exact = LANGUAGES.find((l) => l.code.toLowerCase() === locale.toLowerCase());
  if (exact) return exact.voice;
  const family = locale.split(/[-_]/)[0].toLowerCase();
  return FAMILY[family] ?? LANGUAGES.find((l) => l.code.split('-')[0] === family)?.voice ?? DEFAULT_VOICE;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * The request body for Azure text-to-speech: the family's voice at its natural pace. Remi plays one
 * clip per sentence, so Azure's usual padding of silence before and after each would add up to gaps.
 */
export function speechSsml(text: string, locale: string): string {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${esc(locale)}">`
    + `<voice name="${cloudVoiceFor(locale)}"><mstts:silence type="Leading-exact" value="0ms"/><mstts:silence type="Tailing-exact" value="80ms"/>`
    + `${esc(text)}</voice></speak>`;
}
