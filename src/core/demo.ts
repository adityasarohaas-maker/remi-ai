// The shared judge demo household: every visitor signs into it, so destructive settings are locked.
export const DEMO_HOUSEHOLD_ID = '00000000-0000-4000-8000-00000000d3a0';

export function isDemoHousehold(householdId: string): boolean {
  return householdId === DEMO_HOUSEHOLD_ID;
}

/** Stable ids for the demo's clips ('c') and photos ('p'), so files uploaded once survive every reset. */
export function demoStableId(n: number, kind: 'c' | 'p'): string {
  return `00000000-0000-4000-8000-${kind === 'c' ? 'c' : 'd'}${String(n).padStart(11, '0')}`;
}
