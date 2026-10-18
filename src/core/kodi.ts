// Kodi is Remi's face: a little forest spirit made of light. These rules decide how it feels
// and moves in response to Avni, so the tablet and the tests agree.

export type KodiEmotion = 'calm' | 'happy' | 'excited' | 'caring' | 'surprised' | 'sleepy' | 'love';
export type KodiGesture = 'jump' | 'wave' | 'nod' | 'tilt' | 'hop' | 'armsUp' | 'dance' | 'look';
export type KodiEvent = 'reminder-done' | 'help' | 'greeting';
/** A one-off gesture; the key makes the same gesture play again. */
export type KodiCue = { gesture: KodiGesture; key: number } | null;

/** Dark theme from 7 pm to 6 am in her home: Kodi glows, the screen is easy on tired eyes. */
export function isNightTheme(minutesOfDay: number): boolean {
  return minutesOfDay >= 19 * 60 || minutesOfDay < 6 * 60;
}

const GREETING = /^\s*(hello|hi|good (morning|afternoon|evening)|namaste|नमस्ते|सुप्रभात|शुभ संध्या)(?![\p{L}\p{M}])/iu;

export function kodiFeeling(i: { mood?: string; reply?: string; event?: KodiEvent }): { emotion: KodiEmotion; gesture?: KodiGesture } {
  if (i.event === 'help') return { emotion: 'caring' };
  if (i.event === 'reminder-done') return { emotion: 'happy', gesture: 'hop' };
  const wave = i.event === 'greeting' || (i.reply !== undefined && GREETING.test(i.reply));
  const withWave = (emotion: KodiEmotion) => (wave ? { emotion, gesture: 'wave' as const } : { emotion });
  switch (i.mood) {
    case 'sad': case 'anxious': return withWave('caring');
    case 'happy': return withWave('happy');
    case 'agitated': return { emotion: 'calm' };          // nothing bouncy when she is upset
    case 'confused': return { emotion: 'calm', gesture: 'tilt' };
    default: return withWave('calm');
  }
}
