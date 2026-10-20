import { describe, it, expect } from 'vitest';
import { buildCompanionPrompt, buildRecognitionMessages, languageName } from '@/core/companion-prompt';

const base = {
  preferredName: 'Avni', language: 'hi-IN', about: 'Retired teacher from Jaipur.',
  now: { weekday: 'Saturday', prettyDate: '17 October 2026', prettyTime: '1:10 pm', partOfDay: 'afternoon' as const },
  people: [
    { id: 'p1', name: 'Rohan', relation: 'grandson', notes: 'Loves cricket', isDeceased: false },
    { id: 'p2', name: 'Ramesh', relation: 'husband', notes: null, isDeceased: true },
  ],
  routine: [{ id: 'r1', timeOfDay: '13:00', kind: 'meal' as const, label: 'Lunch', spokenMessage: null, minutes: 780, state: 'due' as const }],
  primaryContactName: 'Priya',
  sensitive: null,
  safety: [],
};

describe('buildCompanionPrompt', () => {
  it('includes name, language, time, people, routine and the mood instruction', () => {
    const p = buildCompanionPrompt(base);
    expect(p).toContain('Avni');
    expect(p).toContain('Usually reply in Hindi');
    expect(p).toContain('Saturday, 17 October 2026, 1:10 pm');
    expect(p).toContain('Rohan — grandson. Loves cricket');
    expect(p).toContain('Ramesh — husband (has passed away');
    expect(p).toContain('1:00 pm Lunch — due now');
    expect(p).toMatch(/MOOD:/);
    expect(p).toContain('Never pretend to be');
  });
  it('answers in the language Avni just used', () => {
    expect(buildCompanionPrompt(base)).toContain('reply in the language Avni used');
  });

  it('only offers what Remi can really do, and never invents what family feel or plan', () => {
    const p = buildCompanionPrompt(base);
    expect(p).toContain('You cannot play music');
    expect(p).toContain('Never make up what a family member feels, says or plans');
    expect(p).toContain('Never say where someone is right now');
  });

  it('ends with a short check the model reads last: language, no guessing, real abilities, length', () => {
    const p = buildCompanionPrompt(base);
    const check = p.slice(p.indexOf('Before you answer, check:'));
    expect(p.indexOf('Before you answer, check:')).toBeGreaterThan(p.indexOf("Today's routine"));
    expect(check).toContain('Your reply is in Hindi.');
    expect(check).toContain('You do not guess where anyone is or what they are doing.');
    expect(check).toContain('You cannot move, find people, play music or make calls.');
    expect(check).toContain("If asked where someone is, say you don't know where they are right now and offer to tell Priya.");
    expect(check).toContain('You never invent memories or stories about her past; you ask her to tell you instead.');
    expect(check).toContain('You never promise what someone else will do.');
  });

  it('talks like a warm friend, not a quiz or an assistant', () => {
    const p = buildCompanionPrompt(base);
    expect(p).toContain('like a warm friend sitting beside her');
    expect(p).toContain('Do not end every reply with a question');
    expect(p).toContain('Do not repeat her own facts back to her');
  });

  it('keeps everyday replies short and lively, with a playful little personality', () => {
    const p = buildCompanionPrompt(base);
    expect(p).toContain('Keep everyday replies under 25 words');
    expect(p).toContain('playful and curious');
    expect(p).toContain('Never lecture or explain at length');
  });

  it('tells a real story when asked, and offers stories, riddles and little chats on its own', () => {
    const p = buildCompanionPrompt(base);
    const check = p.slice(p.indexOf('Before you answer, check:'));
    expect(p).toContain('tell a gentle, cheerful made-up story of about 150 to 250 words');
    expect(p).toContain('tell stories, short poems, riddles and jokes');
    expect(check).toContain('unless she asked for a story');
  });

  it('injects the family script when a sensitive topic matched', () => {
    const p = buildCompanionPrompt({ ...base, sensitive: { id: 'g', topic: 'Husband Ramesh', triggerWords: [], approach: 'share_memory', familyScript: 'Ramesh loved your rajma.', callPersonName: null } });
    expect(p).toContain('Ramesh loved your rajma.');
    expect(p).toContain('Husband Ramesh');
  });
  it('tells the model the family is being alerted when safety words were heard', () => {
    const p = buildCompanionPrompt({ ...base, safety: ['fall'] });
    expect(p).toContain('letting Priya know right now');
  });
});

describe('buildRecognitionMessages', () => {
  it('only uses the person facts and asks for 1–2 sentences', () => {
    const m = buildRecognitionMessages({ preferredName: 'Avni', language: 'en-IN', person: base.people[0] });
    expect(m[0].role).toBe('system');
    expect(m[0].content).toContain('1–2 short');
    expect(m[1].content).toContain('Rohan');
    expect(m[1].content).toContain('Loves cricket');
  });
});

describe('languageName: Remi talks to families worldwide', () => {
  it('names every language a family can choose', () => {
    expect(languageName('es-MX')).toBe('Spanish');
    expect(languageName('ja-JP')).toBe('Japanese');
    expect(languageName('fil-PH')).toBe('Filipino');
    expect(languageName('ar-SA')).toBe('Arabic');
    expect(languageName('sw-KE')).toBe('Swahili');
  });
});

import { wantsStory } from '@/core/companion-prompt';

describe('stories', () => {
  it('knows when she asks for a story, in many languages', () => {
    for (const s of ['Remi, tell me a story', 'tell me another one of your stories', 'ek kahani sunao', 'मुझे एक कहानी सुनाओ', 'cuéntame un cuento', 'raconte-moi une histoire', 'erzähl mir eine Geschichte', 'conta uma história', 'احكي لي قصة', '讲个故事', 'お話をして', 'একটা গল্প বলো']) {
      expect(wantsStory(s)).toBe(true);
    }
    for (const s of ['what day is it', 'I had my tea', 'is Rohan coming']) expect(wantsStory(s)).toBe(false);
  });

  it('turns Remi into a real storyteller when she asks for one', () => {
    const p = buildCompanionPrompt({ ...base, story: true });
    expect(p).toContain('wonderful storyteller');
    expect(p).toContain('150 to 250 words');
    expect(p).toContain('Panchatantra');
    expect(p).toContain('Nothing scary or sad');
    // the rule the model weighs most is the last one: a whole story, no question at the end
    const check = p.slice(p.indexOf('Before you answer, check:'));
    expect(check).toContain('a whole story of 150 to 250 words');
    expect(check).not.toContain('Under 25 words');
    expect(buildCompanionPrompt(base)).not.toContain('wonderful storyteller');
  });
});
