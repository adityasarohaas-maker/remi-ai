import type { DayFacts } from './day-summary';
import type { ChatMessage } from '@/lib/claude';

export function buildDigestMessages(preferredName: string, facts: DayFacts, storiesToday: string[] = []): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You write a short evening note to the family of ${preferredName}, who lives with dementia, from a day of tablet-companion activity.
Only use the facts in the JSON. Be warm, plain and practical. Use these headings: "How the day went", "Questions asked most", "Medicines and meals", "Anything to watch".
Keep it under 180 words. These are observations, not a diagnosis: never name medical conditions, never suggest treatments. If there is little data, say so plainly.${storiesToday.length ? `\nUnder "How the day went", add one line beginning "Today ${preferredName} told me about" naming the stories in storiesToday.` : ''}`,
    },
    { role: 'user', content: JSON.stringify(storiesToday.length ? { ...facts, storiesToday } : facts) },
  ];
}
