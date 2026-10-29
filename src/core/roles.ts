export type Role = 'owner' | 'admin' | 'family';

/** Owners and admins run the household: invites, consent, marking her passed, export. */
export function canAdmin(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}

/** Only an owner can hand out admin; admins may invite family. */
export function canInvite(role: Role, invitedRole: Role): boolean {
  if (invitedRole === 'owner') return false;
  if (invitedRole === 'admin') return role === 'owner';
  return canAdmin(role);
}

export const INVITE_DAYS = 7;
export function inviteExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000);
}
