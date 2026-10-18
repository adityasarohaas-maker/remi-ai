import { describe, it, expect } from 'vitest';
import { buildCompanionPrompt, buildRecognitionMessages } from '@/core/companion-prompt';

const base = {
  preferredName: 'Kamla', language: 'hi-IN', about: 'Retired teacher from Jaipur.',
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
    expect(p).toContain('Kamla');
    expect(p).toContain('Reply in Hindi');
    expect(p).toContain('Saturday, 17 October 2026, 1:10 pm');
    expect(p).toContain('Rohan — grandson. Loves cricket');
    expect(p).toContain('Ramesh — husband (has passed away');
    expect(p).toContain('1:00 pm Lunch — due now');
    expect(p).toMatch(/MOOD:/);
    expect(p).toContain('Never pretend to be');
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
    const m = buildRecognitionMessages({ preferredName: 'Kamla', language: 'en-IN', person: base.people[0] });
    expect(m[0].role).toBe('system');
    expect(m[0].content).toContain('1–2 short');
    expect(m[1].content).toContain('Rohan');
    expect(m[1].content).toContain('Loves cricket');
  });
});
