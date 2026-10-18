import type { DayFacts } from './day-summary';
import type { ChatMessage } from '@/lib/nebius';

export function buildDigestMessages(preferredName: string, facts: DayFacts): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You write a short evening note to the family of ${preferredName}, who lives with dementia, from a day of tablet-companion activity.
Only use the facts in the JSON. Be warm, plain and practical. Use these headings: "How the day went", "Questions asked most", "Medicines and meals", "Anything to watch".
Keep it under 180 words. These are observations, not a diagnosis: never name medical conditions, never suggest treatments. If there is little data, say so plainly.`,
    },
    { role: 'user', content: JSON.stringify(facts) },
  ];
}
