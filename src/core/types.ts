export interface Household {
  id: string; patientName: string; preferredName: string; language: string; timezone: string;
  about: string | null; homeAddress: string | null;
  primaryContactName: string | null; primaryContactPhone: string | null;
}
export interface Person { id: string; name: string; relation: string; notes: string | null; isDeceased: boolean }
export interface RoutineItem { id: string; timeOfDay: string; kind: 'medicine' | 'meal' | 'activity'; label: string; spokenMessage: string | null }
export type Approach = 'redirect' | 'share_memory' | 'call_relative';
export interface Guidance { id: string; topic: string; triggerWords: string[]; approach: Approach; familyScript: string; callPersonName: string | null }
export interface HouseholdContext {
  household: Household; people: Person[]; routine: RoutineItem[];
  doneIds: string[]; guidance: Guidance[];
}
