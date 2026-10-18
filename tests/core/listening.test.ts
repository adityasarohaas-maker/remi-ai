import { describe, it, expect } from 'vitest';
import {
  classifyHeard, stripWakeWord, isDoneReply, inQuietHours, shouldCheckIn, checkInLine, worthJoining,
  FOLLOW_UP_MS, CHECK_IN_AFTER_MS,
} from '@/core/listening';

const T0 = 1_000_000;

describe('classifyHeard', () => {
  it('treats speech with the wake word as addressed, without the wake word', () => {
    expect(classifyHeard('Remi, what day is it?', { nowMs: T0, lastSpokeAtMs: 0 })).toEqual({ kind: 'addressed', text: 'what day is it?' });
    expect(classifyHeard('hey remy where is Priya', { nowMs: T0, lastSpokeAtMs: 0 })).toEqual({ kind: 'addressed', text: 'where is Priya' });
    expect(classifyHeard('रेमी आज क्या दिन है', { nowMs: T0, lastSpokeAtMs: 0 })).toEqual({ kind: 'addressed', text: 'आज क्या दिन है' });
  });

  it('answers the wake word alone with a wake', () => {
    expect(classifyHeard('Remi?', { nowMs: T0, lastSpokeAtMs: 0 })).toEqual({ kind: 'wake' });
    expect(classifyHeard('hello Remi', { nowMs: T0, lastSpokeAtMs: 0 })).toEqual({ kind: 'wake' });
  });

  it('treats speech soon after Remi spoke as a possible reply', () => {
    expect(classifyHeard('yes please', { nowMs: T0 + FOLLOW_UP_MS - 1, lastSpokeAtMs: T0 })).toEqual({ kind: 'followup', text: 'yes please' });
    expect(classifyHeard('yes please', { nowMs: T0 + FOLLOW_UP_MS + 1, lastSpokeAtMs: T0 })).toEqual({ kind: 'overheard', text: 'yes please' });
  });

  it('does not mistake words that only contain the name', () => {
    expect(classifyHeard('the premium plan', { nowMs: T0, lastSpokeAtMs: 0 }).kind).toBe('overheard');
  });

  it('ignores empty speech', () => {
    expect(classifyHeard('   ', { nowMs: T0, lastSpokeAtMs: 0 })).toEqual({ kind: 'ignore' });
  });
});

describe('stripWakeWord', () => {
  it('removes greetings and the name wherever they lead', () => {
    expect(stripWakeWord('Okay Remi, tell me a song')).toBe('tell me a song');
    expect(stripWakeWord('what time is it Remi')).toBe('what time is it');
  });
});

describe('isDoneReply', () => {
  it('hears done, yes and their Hindi forms', () => {
    for (const s of ['Done', 'yes I took it', 'I have taken it', 'okay', 'haan', 'ho gaya', 'हाँ', 'हो गया', 'ले ली', 'खा लिया']) expect(isDoneReply(s)).toBe(true);
  });
  it('does not count a refusal or a question', () => {
    for (const s of ['not yet', 'no', 'what tablet?', 'नहीं']) expect(isDoneReply(s)).toBe(false);
  });
});

describe('inQuietHours', () => {
  it('is quiet from 9 pm to 7 am', () => {
    expect(inQuietHours(21 * 60)).toBe(true);
    expect(inQuietHours(3 * 60)).toBe(true);
    expect(inQuietHours(7 * 60)).toBe(false);
    expect(inQuietHours(20 * 60 + 59)).toBe(false);
  });
});

describe('shouldCheckIn', () => {
  const base = { nowMs: T0 + CHECK_IN_AFTER_MS, lastActivityMs: T0, lastCheckInMs: 0, minutesOfDay: 15 * 60 };
  it('checks in after a long quiet spell in the day', () => {
    expect(shouldCheckIn(base)).toBe(true);
  });
  it('waits while it has been recently busy, recently checked in, or it is night', () => {
    expect(shouldCheckIn({ ...base, lastActivityMs: T0 + 1 })).toBe(false);
    expect(shouldCheckIn({ ...base, lastCheckInMs: T0 + 1 })).toBe(false);
    expect(shouldCheckIn({ ...base, minutesOfDay: 22 * 60 })).toBe(false);
  });
});

describe('checkInLine', () => {
  const people = [
    { name: 'Rohan', relation: 'grandson', isDeceased: false },
    { name: 'Ramesh', relation: 'husband', isDeceased: true },
  ];
  it('rotates warm lines and never invites talk about someone who has passed away', () => {
    const lines = Array.from({ length: 8 }, (_, i) => checkInLine('en-IN', 'Avni', people, i));
    expect(new Set(lines).size).toBeGreaterThan(2);
    expect(lines.some((l) => l.includes('Rohan, your grandson'))).toBe(true);
    expect(lines.every((l) => l.includes('Avni'))).toBe(true);
    expect(lines.some((l) => l.includes('Ramesh'))).toBe(false);
  });
  it('speaks Hindi for Hindi households', () => {
    expect(checkInLine('hi-IN', 'Avni', [], 0)).toMatch(/[ऀ-ॿ]/);
  });
});

describe('worthJoining', () => {
  const names = ['Rohan', 'Priya'];
  it('joins in on questions, known names and confusion', () => {
    expect(worthJoining('what day is it today', names)).toBe(true);
    expect(worthJoining('kya din hai aaj', names)).toBe(true);
    expect(worthJoining('when is Rohan coming', names)).toBe(true);
    expect(worthJoining('I want to go home', names)).toBe(true);
    expect(worthJoining('मैं कहाँ हूँ', names)).toBe(true);
  });
  it('stays out of ordinary chatter', () => {
    expect(worthJoining('the tea is nice and hot', names)).toBe(false);
    expect(worthJoining('ok', names)).toBe(false);
  });
});

import { voiceCommand } from '@/core/listening';

describe('voiceCommand', () => {
  it('opens the face screen and the day screen by voice', () => {
    expect(voiceCommand('who is this')).toBe('face');
    expect(voiceCommand('who is this person?')).toBe('face');
    expect(voiceCommand('ये कौन है')).toBe('face');
    expect(voiceCommand('ye kaun hai')).toBe('face');
    expect(voiceCommand('what is my day')).toBe('today');
    expect(voiceCommand('show me my day')).toBe('today');
    expect(voiceCommand('what do I have today')).toBe('today');
    expect(voiceCommand('मेरा दिन')).toBe('today');
    expect(voiceCommand('go back')).toBe('home');
  });
  it('leaves ordinary questions to the conversation', () => {
    expect(voiceCommand('who is Rohan')).toBeNull();
    expect(voiceCommand('what day is it')).toBeNull();
  });
});
