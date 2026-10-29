import { describe, it, expect } from 'vitest';
import { dueToOpen, letterExpiry, LETTER_LINK_DAYS } from '@/core/letters';
import type { MemoryRule } from '@/core/types';

const rule = (r: Partial<MemoryRule> & { openedAt?: string | null }): MemoryRule & { openedAt: string | null } =>
  ({ visibility: 'everyone', visibleTo: [], openOn: null, openEventId: null, openedAt: null, ...r });
const living = { status: 'living' as const, today: '2026-10-29', happenedEventIds: [] as string[] };
const passed = { ...living, status: 'passed' as const };

describe('dueToOpen', () => {
  it('opens an after-death letter once she has passed, whoever it is for', () => {
    expect(dueToOpen(rule({ visibility: 'after_death', visibleTo: ['arjun'] }), passed)).toBe(true);
    expect(dueToOpen(rule({ visibility: 'after_death' }), living)).toBe(false);
  });
  it('never opens twice', () => {
    expect(dueToOpen(rule({ visibility: 'after_death', openedAt: '2026-10-01T00:00:00Z' }), passed)).toBe(false);
  });
  it('opens on the day the family marks', () => {
    expect(dueToOpen(rule({ visibility: 'on_event', openEventId: 'wed' }), living)).toBe(false);
    expect(dueToOpen(rule({ visibility: 'on_event', openEventId: 'wed' }), { ...living, happenedEventIds: ['wed'] })).toBe(true);
  });
  it('is never due for remi-only or everyday memories', () => {
    expect(dueToOpen(rule({ visibility: 'remi_only' }), passed)).toBe(false);
    expect(dueToOpen(rule({ visibility: 'everyone' }), passed)).toBe(false);
  });
  it('a letter link lasts thirty days', () => {
    expect(LETTER_LINK_DAYS).toBe(30);
    expect(letterExpiry(new Date('2026-10-29T00:00:00Z')).toISOString()).toBe('2026-11-28T00:00:00.000Z');
  });
});

describe('canMakeLetterLink', () => {
  it('only for an opened letter addressed to someone without an account', async () => {
    const { canMakeLetterLink } = await import('@/core/letters');
    expect(canMakeLetterLink({ visibleTo: [], recipientName: 'Riya', openedAt: '2026-10-20T00:00:00Z' })).toBe(true);
    expect(canMakeLetterLink({ visibleTo: ['priya'], recipientName: 'Riya', openedAt: '2026-10-20T00:00:00Z' })).toBe(false);
    expect(canMakeLetterLink({ visibleTo: [], recipientName: null, openedAt: '2026-10-20T00:00:00Z' })).toBe(false);
    expect(canMakeLetterLink({ visibleTo: [], recipientName: 'Riya', openedAt: null })).toBe(false);
  });
});

describe('letterLinkState', () => {
  it('is single-use, with a day to come back to it, then expired', async () => {
    const { letterLinkState, LETTER_REOPEN_HOURS } = await import('@/core/letters');
    expect(LETTER_REOPEN_HOURS).toBe(24);
    const now = new Date('2026-11-01T12:00:00Z');
    expect(letterLinkState({ expiresAt: '2026-11-20T00:00:00Z', usedAt: null }, now)).toBe('fresh');
    expect(letterLinkState({ expiresAt: '2026-11-20T00:00:00Z', usedAt: '2026-11-01T10:00:00Z' }, now)).toBe('open');
    expect(letterLinkState({ expiresAt: '2026-11-20T00:00:00Z', usedAt: '2026-10-30T10:00:00Z' }, now)).toBe('expired');
    expect(letterLinkState({ expiresAt: '2026-10-31T00:00:00Z', usedAt: null }, now)).toBe('expired');
  });
});
