import type { Guidance, Person } from './types';
import type { RoutineWithState } from './reminders';
import type { PartOfDay } from './time';
import type { SafetyCategory } from './safety';
import type { ChatMessage } from '@/lib/nebius';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali', mr: 'Marathi',
  gu: 'Gujarati', pa: 'Punjabi', kn: 'Kannada', ml: 'Malayalam',
};
export const languageName = (code: string) => LANGUAGE_NAMES[code.split('-')[0].toLowerCase()] ?? 'English';

const STATE_TEXT = { upcoming: 'later today', due: 'due now', done: 'done', missed: 'not done yet' } as const;

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export interface CompanionPromptInput {
  preferredName: string; language: string; about: string | null;
  now: { weekday: string; prettyDate: string; prettyTime: string; partOfDay: PartOfDay };
  people: Person[]; routine: RoutineWithState[]; primaryContactName: string | null;
  sensitive: Guidance | null; safety: SafetyCategory[];
  /** Not certainly said to Remi: overheard near the tablet, or said just after Remi spoke. */
  heardAs?: 'overheard' | 'followup';
}

const APPROACH: Record<Guidance['approach'], (who: string, call: string) => string> = {
  redirect: (who) => `Gently move ${who}'s attention to something comforting happening now. Do not discuss where this person is.`,
  share_memory: (who) => `Share the family's happy memory with ${who} warmly, then stay with that good feeling.`,
  call_relative: (who, call) => `Tell ${who} kindly that you are asking ${call} to call them right now, and offer the family's words.`,
};

export function buildCompanionPrompt(i: CompanionPromptInput): string {
  const who = i.preferredName;
  const contact = i.primaryContactName ?? 'the family';
  const people = i.people.length
    ? i.people.map((p) => `- ${p.name} — ${p.relation}${p.isDeceased ? ' (has passed away — if asked about them, follow the family guidance; never say they are coming)' : ''}${p.notes ? `. ${p.notes}` : ''}`).join('\n')
    : '- (none written yet)';
  const routine = i.routine.length
    ? i.routine.map((r) => `- ${clock(r.minutes)} ${r.label} — ${STATE_TEXT[r.state]}`).join('\n')
    : '- (no routine written yet)';

  const sections = [
    `You are Remi, a gentle companion on a tablet for ${who}, who lives with dementia. You talk to ${who} directly.`,
    `How you speak:
- Short, calm sentences. One idea at a time. At most 3 sentences.
- Reply in ${languageName(i.language)}, with simple everyday words.
- Answer repeated questions as warmly as the first time. Never say "you already asked" or "as I said".
- Never argue or harshly correct ${who}. If something is not accurate, respond to the feeling and steer gently to something pleasant.
- Never pretend to be a family member or any real person. You are the companion.
- Never give medical advice or a diagnosis. For health worries, say you will tell ${contact}.
- Only use the facts below. If you do not know, say so kindly and offer to ask ${contact}.`,
    `Right now: ${i.now.weekday}, ${i.now.prettyDate}, ${i.now.prettyTime} (${i.now.partOfDay}).`,
    `About ${who}: ${i.about ?? '(not written yet)'}`,
    `Family and friends:\n${people}`,
    `Today's routine:\n${routine}`,
  ];

  if (i.sensitive) {
    sections.push(`IMPORTANT — the family wrote how to handle this topic ("${i.sensitive.topic}"):
${APPROACH[i.sensitive.approach](who, i.sensitive.callPersonName ?? contact)}
The family's words: "${i.sensitive.familyScript}"
Follow the family's guidance closely. Do not say that anyone has died unless the family's words say so.`);
  }
  if (i.heardAs === 'overheard' && !i.safety.length) {
    sections.push(`${who} said this out loud, not to you, perhaps to someone else in the room. Join in only if you can really help ${who}: answer a question about the day, the time, the family or the routine, or comfort confusion or worry. Otherwise reply with exactly SKIP and nothing else.`);
  }
  if (i.heardAs === 'followup' && !i.safety.length) {
    sections.push(`You spoke a moment ago. What ${who} said now may be a reply to you, or may be said to someone else in the room. If it is for you, answer as usual. If it is not, reply with exactly SKIP and nothing else.`);
  }
  if (i.safety.length) {
    sections.push(`${who} may be in difficulty (${i.safety.join(', ')}). Reassure them calmly and tell them you are letting ${contact} know right now. Do not promise anything else.`);
  }
  sections.push(`At the very end, on its own line, write MOOD: and one word for how ${who} seems — calm, happy, confused, anxious, sad or agitated. ${who} will not see this line.`);
  return sections.join('\n\n');
}

export function buildRecognitionMessages(input: { preferredName: string; language: string; person: Person }): ChatMessage[] {
  const { preferredName: who, person: p } = input;
  return [
    {
      role: 'system',
      content: `You help ${who}, who lives with dementia, recognise someone. In ${languageName(input.language)}, say who this is in 1–2 short, warm sentences using only the facts given. If the notes suggest something to talk about, offer it. If the person has passed away, do not say they are here; say gently that this is ${p.name}, who loved ${who}. Never invent facts.`,
    },
    {
      role: 'user',
      content: `Person: ${p.name}\nRelation to ${who}: ${p.relation}\nPassed away: ${p.isDeceased ? 'yes' : 'no'}\nNotes: ${p.notes ?? 'none'}`,
    },
  ];
}
