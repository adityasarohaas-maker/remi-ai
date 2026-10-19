// Languages the tablet is fully translated into. Any other language a family picks still gets
// Remi replying and speaking in it; only the buttons stay in English.
export const MAIN_LANGUAGES = ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'ur', 'es', 'fr', 'de', 'pt', 'ar', 'zh', 'ja'] as const;
export type LangKey = (typeof MAIN_LANGUAGES)[number];

export function langKey(locale: string): LangKey {
  const base = locale.split(/[-_]/)[0].toLowerCase();
  return (MAIN_LANGUAGES as readonly string[]).includes(base) ? (base as LangKey) : 'en';
}

const RTL = ['ar', 'ur', 'he', 'fa'];
export function isRtl(locale: string): boolean {
  return RTL.includes(locale.split(/[-_]/)[0].toLowerCase());
}
