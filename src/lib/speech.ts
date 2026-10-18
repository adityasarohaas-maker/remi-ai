type RecognitionResult = ArrayLike<{ transcript: string }> & { isFinal?: boolean };

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous?: boolean;
  onresult: ((e: { resultIndex?: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}

export function speechRecognitionCtor(win: unknown): (new () => SpeechRecognitionLike) | null {
  const w = win as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown } | undefined;
  return ((w?.SpeechRecognition ?? w?.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined) ?? null;
}

function utter(text: string, lang: string): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.9;
  const voices = synth.getVoices();
  u.voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.split('-')[0])) ?? null;
  return u;
}

export function speak(text: string, lang: string): void {
  const u = utter(text, lang);
  if (u) window.speechSynthesis.speak(u);
}

/** Speaks and resolves when done. Some browsers never fire onend, so a length-based timer also resolves it. */
export function speakAsync(
  text: string, lang: string, maxMs = 3000 + text.length * 90,
  o: { onWord?: () => void } = {},
): Promise<void> {
  const u = utter(text, lang);
  if (!u) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, maxMs);
    u.onend = u.onerror = () => { clearTimeout(timer); resolve(); };
    // Word beats (not every voice reports them) let the orb move with Remi's voice.
    if (o.onWord) u.onboundary = (e) => { if (e.name === 'word') o.onWord?.(); };
    window.speechSynthesis.speak(u);
  });
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

// What the Talk screen should do when listening fails. Speech that exists but can never work
// (blocked mic, Siri/Dictation off on iPad, no speech service) must switch to typing.
export function speechErrorAction(code: string): 'type' | 'again' | 'quiet' {
  if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'unsupported', 'language-not-supported'].includes(code)) return 'type';
  if (code === 'aborted') return 'quiet';
  return 'again';
}

export type ListenerState = 'listening' | 'paused' | 'blocked' | 'stopped';
const FATAL = ['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'];

/**
 * Always-on listening for hands-free Remi. Browsers end recognition after a silence or a network blip,
 * so it restarts itself; it pauses while Remi speaks (so Remi never hears itself) and gives up only
 * when the microphone is blocked.
 */
export function createListener(
  Ctor: new () => SpeechRecognitionLike,
  o: {
    lang: string; onText: (text: string) => void; onState: (s: ListenerState) => void; restartDelayMs?: number;
    /** Words as they are being spoken, for live captions. */
    onInterim?: (text: string) => void;
    /** Treat speech as finished once the live words stop changing for this long (0 = wait for the browser). */
    settleMs?: number;
  },
) {
  const rec = new Ctor();
  rec.lang = o.lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let wanted = false, paused = false, fatal = false, active = false, delay = o.restartDelayMs ?? 300;

  // Browsers wait a second or more of silence before calling a phrase final. Live words that stop
  // changing for settleMs are taken as finished, and the browser's late final for them is skipped.
  let settle: ReturnType<typeof setTimeout> | null = null;
  const early = new Set<number>(); // result indexes already sent early, this session
  const clearSettle = () => { if (settle) { clearTimeout(settle); settle = null; } };

  rec.onresult = (e) => {
    for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
      const r = e.results[i];
      const text = r?.[0]?.transcript?.trim();
      if (!r || !text) continue;
      if (r.isFinal !== false) {
        clearSettle();
        if (!early.delete(i)) o.onText(text);
      } else if (!early.has(i)) {
        o.onInterim?.(text);
        clearSettle();
        if (o.settleMs) {
          settle = setTimeout(() => { settle = null; early.add(i); o.onText(text); }, o.settleMs);
        }
      }
    }
  };
  rec.onerror = (e) => {
    if (FATAL.includes(e.error)) { fatal = true; o.onState('blocked'); }
    else if (e.error === 'network') delay = Math.min(delay * 2 + 500, 10_000);
  };
  rec.onend = () => {
    active = false;
    clearSettle();
    early.clear(); // result indexes start again in the next session
    if (wanted && !paused && !fatal) setTimeout(begin, delay);
  };

  function begin() {
    if (!wanted || paused || fatal || active) return;
    try {
      rec.start();
      active = true;
      delay = o.restartDelayMs ?? 300;
      o.onState('listening');
    } catch {
      setTimeout(begin, 1000); // still shutting down from the last session
    }
  }
  const halt = () => { clearSettle(); if (active) (rec.abort ?? rec.stop).call(rec); };

  return {
    start() { wanted = true; begin(); },
    pause() { paused = true; halt(); o.onState('paused'); },
    resume() { paused = false; begin(); },
    stop() { wanted = false; halt(); o.onState('stopped'); },
  };
}
