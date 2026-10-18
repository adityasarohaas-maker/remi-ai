// The shared judge demo household: every visitor signs into it, so destructive settings are locked.
export const DEMO_HOUSEHOLD_ID = '00000000-0000-4000-8000-00000000d3a0';

export function isDemoHousehold(householdId: string): boolean {
  return householdId === DEMO_HOUSEHOLD_ID;
}
