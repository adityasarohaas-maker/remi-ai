export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export function speechRecognitionCtor(win: unknown): (new () => SpeechRecognitionLike) | null {
  const w = win as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown } | undefined;
  return ((w?.SpeechRecognition ?? w?.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined) ?? null;
}

export function speak(text: string, lang: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.9;
  const voices = synth.getVoices();
  u.voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.split('-')[0])) ?? null;
  synth.speak(u);
}

export function listenOnce(lang: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = speechRecognitionCtor(typeof window === 'undefined' ? undefined : window);
    if (!Ctor) return reject(new Error('unsupported'));
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let heard = '';
    rec.onresult = (e) => { heard = e.results[0]?.[0]?.transcript ?? ''; };
    rec.onerror = (e) => reject(new Error(e.error));
    rec.onend = () => resolve(heard.trim());
    rec.start();
  });
}
