import { describe, it, expect } from 'vitest';
import { cloudVoiceFor, speechSsml, voiceLocale, LANGUAGES, isSupportedLanguage } from '@/core/voices';

describe('cloudVoiceFor: a soft female neural voice for every family, worldwide', () => {
  it('uses the voice for the exact locale', () => {
    expect(cloudVoiceFor('en-IN')).toBe('en-IN-NeerjaNeural');
    expect(cloudVoiceFor('hi-IN')).toBe('hi-IN-SwaraNeural');
    expect(cloudVoiceFor('en-GB')).toBe('en-GB-SoniaNeural');
    expect(cloudVoiceFor('es-MX')).toBe('es-MX-DaliaNeural');
    expect(cloudVoiceFor('ja-JP')).toBe('ja-JP-NanamiNeural');
  });

  it('falls back to the language family, then to US English', () => {
    expect(cloudVoiceFor('en-NZ')).toBe('en-US-JennyNeural');
    expect(cloudVoiceFor('fr-CA')).toBe('fr-CA-SylvieNeural');
    expect(cloudVoiceFor('fr-BE')).toBe('fr-FR-DeniseNeural');
    expect(cloudVoiceFor('xx-YY')).toBe('en-US-JennyNeural');
  });

  it('has a voice for every language a family can choose', () => {
    for (const l of LANGUAGES) expect(cloudVoiceFor(l.code)).toMatch(/^[a-z]{2,3}-[A-Z]{2}-\w+Neural$/);
  });
});

describe('isSupportedLanguage', () => {
  it('accepts only languages in the list', () => {
    expect(isSupportedLanguage('es-ES')).toBe(true);
    expect(isSupportedLanguage('hi-IN')).toBe(true);
    expect(isSupportedLanguage('klingon')).toBe(false);
  });
});

describe('voiceLocale', () => {
  it('uses the household language, but a Hindi reply gets the Hindi voice', () => {
    expect(voiceLocale('Good morning', 'en-GB')).toBe('en-GB');
    expect(voiceLocale('सुप्रभात', 'en-GB')).toBe('hi-IN');
    expect(voiceLocale('सुप्रभात', 'mr-IN')).toBe('mr-IN');
  });
});

describe('speechSsml', () => {
  it('speaks the text in the chosen voice at its natural pace, without padded silence, safely escaped', () => {
    const ssml = speechSsml('Tea & "biscuits" <now>', 'en-IN');
    expect(ssml).toContain('<voice name="en-IN-NeerjaNeural">');
    expect(ssml).toContain('xml:lang="en-IN"');
    expect(ssml).not.toContain('rate=');
    expect(ssml).toContain('<mstts:silence type="Leading-exact" value="0ms"/>');
    expect(ssml).toContain('Tea &amp; &quot;biscuits&quot; &lt;now&gt;');
    expect(ssml).not.toContain('<now>');
  });
});
