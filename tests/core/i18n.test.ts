import { describe, it, expect } from 'vitest';
import { MAIN_LANGUAGES, langKey, isRtl } from '@/core/i18n';
import { phrasesFor } from '@/core/phrases';
import { labelsFor } from '@/app/patient/[token]/labels';
import { fallbackReply, helpSentMessage, wakeReply, wellDoneMessage } from '@/core/messages';
import { checkInLine, classifyHeard, isDoneReply } from '@/core/listening';
import { detectSafetyWords } from '@/core/safety';

// every leaf of a label set: strings must be non-empty, functions must return text
function leaves(o: unknown, path = ''): [string, unknown][] {
  if (typeof o === 'string' || typeof o === 'function') return [[path, o]];
  return Object.entries(o as object).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

describe('languages', () => {
  it('maps any locale to a translated language, or English', () => {
    expect(langKey('es-MX')).toBe('es');
    expect(langKey('hi-IN')).toBe('hi');
    expect(langKey('sw-KE')).toBe('en');
  });
  it('knows which languages read right to left', () => {
    expect(isRtl('ar-SA')).toBe(true);
    expect(isRtl('ur-PK')).toBe(true);
    expect(isRtl('fr-FR')).toBe(false);
  });
});

describe('the tablet speaks 14 languages fully', () => {
  const en = leaves(labelsFor('en-US')).map(([p]) => p);
  for (const l of MAIN_LANGUAGES) {
    it(`${l}: every screen label is translated`, () => {
      const got = leaves(labelsFor(l));
      expect(got.map(([p]) => p)).toEqual(en);
      for (const [p, v] of got) {
        const text = typeof v === 'function' ? (v as (n: string) => string)('Avni') : v;
        expect(typeof text === 'string' && text.trim().length > 0, `${l}.${p}`).toBe(true);
      }
      if (l !== 'en') expect(labelsFor(l).help).not.toBe(labelsFor('en').help);
    });
    it(`${l}: Remi's spoken phrases exist and use the names given`, () => {
      const p = phrasesFor(l);
      expect(p.wake('Avni')).toContain('Avni');
      expect(p.helpSent('Priya')).toContain('Priya');
      expect(p.checkIns('Avni', { name: 'Rohan', relation: 'grandson' })).toHaveLength(4);
      expect(p.fallback.length).toBeGreaterThan(5);
    });
  }
});

describe('spoken messages follow the language', () => {
  it('speaks Spanish, French and Japanese', () => {
    expect(fallbackReply('es-ES')).toBe(phrasesFor('es').fallback);
    expect(helpSentMessage('fr-FR', 'Priya')).toContain('Priya');
    expect(wakeReply('ja-JP', 'Avni')).toBe(phrasesFor('ja').wake('Avni'));
    expect(wellDoneMessage('de-DE', 'Avni')).toBe(phrasesFor('de').wellDone('Avni'));
    expect(checkInLine('pt-BR', 'Avni', [], 0)).toBe(phrasesFor('pt').checkIns('Avni', null)[0]);
  });
  it('falls back to English for a language without translations', () => {
    expect(fallbackReply('sw-KE')).toBe(phrasesFor('en').fallback);
  });
});

describe('listening in other languages', () => {
  const at = { nowMs: 10_000_000, lastSpokeAtMs: 0 };
  it('hears Remi\'s name in other scripts', () => {
    for (const s of ['রেমি, আজ কী বার?', 'ரெமி இன்று என்ன நாள்', 'ریمی آج کون سا دن ہے', 'ريمي ما هو اليوم', 'レミ、今日は何曜日']) {
      expect(classifyHeard(s, at).kind, s).not.toBe('overheard');
    }
  });
  it('hears "done" for a reminder in other languages', () => {
    for (const s of ['sí, listo', 'oui', 'ja, fertig', 'sim', 'はい', 'نعم', 'হ্যাঁ']) expect(isDoneReply(s), s).toBe(true);
    for (const s of ['no', 'non', 'nein', 'não', 'いいえ', 'لا']) expect(isDoneReply(s), s).toBe(false);
  });
  it('alerts the family on falls and pain in other languages', () => {
    expect(detectSafetyWords('me caí en el baño')).toContain('fall');
    expect(detectSafetyWords("j'ai mal au dos")).toContain('pain');
    expect(detectSafetyWords('ich bin gestürzt')).toContain('fall');
    expect(detectSafetyWords('estou com dor')).toContain('pain');
    expect(detectSafetyWords('أنا سقطت')).toContain('fall');
    expect(detectSafetyWords('転んだ')).toContain('fall');
    expect(detectSafetyWords('আমি পড়ে গেছি')).toContain('fall');
  });
});
