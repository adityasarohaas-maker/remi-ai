import { describe, it, expect } from 'vitest';
import { canAdmin, canInvite, inviteExpiry } from '@/core/roles';

describe('roles', () => {
  it('owners and admins run the household; family members do not', () => {
    expect(canAdmin('owner')).toBe(true);
    expect(canAdmin('admin')).toBe(true);
    expect(canAdmin('family')).toBe(false);
  });
  it('only an owner can make another admin', () => {
    expect(canInvite('owner', 'admin')).toBe(true);
    expect(canInvite('admin', 'admin')).toBe(false);
    expect(canInvite('admin', 'family')).toBe(true);
    expect(canInvite('family', 'family')).toBe(false);
  });
  it('an invite lasts seven days', () => {
    expect(inviteExpiry(new Date('2026-10-29T00:00:00Z')).toISOString()).toBe('2026-11-05T00:00:00.000Z');
  });
});
