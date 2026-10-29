import { describe, it, expect } from 'vitest';
import { memoryOpen, sealedLabel } from '@/core/visibility';
import type { MemoryRule } from '@/core/types';

const rule = (r: Partial<MemoryRule>): MemoryRule => ({ visibility: 'everyone', visibleTo: [], openOn: null, openEventId: null, ...r });
const living = { viewerId: 'priya', status: 'living' as const, today: '2026-10-29', happenedEventIds: [] as string[] };
const passed = { ...living, status: 'passed' as const };

describe('memoryOpen', () => {
  it('opens everyone memories to any member', () => {
    expect(memoryOpen(rule({}), living)).toBe(true);
  });
  it('opens members memories only to those named', () => {
    expect(memoryOpen(rule({ visibility: 'members', visibleTo: ['priya'] }), living)).toBe(true);
    expect(memoryOpen(rule({ visibility: 'members', visibleTo: ['arjun'] }), living)).toBe(false);
  });
  it('keeps after-death memories sealed while she is living', () => {
    expect(memoryOpen(rule({ visibility: 'after_death' }), living)).toBe(false);
    expect(memoryOpen(rule({ visibility: 'after_death' }), passed)).toBe(true);
    expect(memoryOpen(rule({ visibility: 'after_death', visibleTo: ['arjun'] }), passed)).toBe(false);
  });
  it('opens on_date memories on exactly the open date', () => {
    expect(memoryOpen(rule({ visibility: 'on_date', openOn: '2026-10-30' }), living)).toBe(false);
    expect(memoryOpen(rule({ visibility: 'on_date', openOn: '2026-10-29' }), living)).toBe(true);
  });
  it('opens on_event memories once the event has happened', () => {
    const m = rule({ visibility: 'on_event', openEventId: 'wed' });
    expect(memoryOpen(m, living)).toBe(false);
    expect(memoryOpen(m, { ...living, happenedEventIds: ['wed'] })).toBe(true);
  });
  it('never opens remi_only, not even after death', () => {
    expect(memoryOpen(rule({ visibility: 'remi_only' }), passed)).toBe(false);
  });
  it('ignores the viewer when viewerId is null (used to decide when a letter is due)', () => {
    expect(memoryOpen(rule({ visibility: 'after_death', visibleTo: ['arjun'] }), { ...passed, viewerId: null })).toBe(true);
    expect(memoryOpen(rule({ visibility: 'members', visibleTo: ['arjun'] }), { ...passed, viewerId: null })).toBe(true);
  });
});

describe('sealedLabel', () => {
  const names = { priya: 'Priya', arjun: 'Arjun' };
  it('names who a members memory is for', () => {
    expect(sealedLabel(rule({ visibility: 'members', visibleTo: ['priya'] }), names)).toBe('For Priya only');
  });
  it('describes each sealed rule', () => {
    expect(sealedLabel(rule({ visibility: 'after_death' }), names)).toBe("Opens after she's gone");
    expect(sealedLabel(rule({ visibility: 'on_date', openOn: '2027-02-12' }), names)).toBe('Sealed until 12 Feb 2027');
    expect(sealedLabel(rule({ visibility: 'on_event', openEventId: 'wed' }), names, { wed: "Riya's wedding" })).toBe("Opens on Riya's wedding");
    expect(sealedLabel(rule({ visibility: 'remi_only' }), names)).toBe('Kept only with Remi');
  });
});
