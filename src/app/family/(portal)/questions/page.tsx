import Link from 'next/link';
import { requireFamily } from '@/lib/household';
import { askQuestion, deleteQuestion } from './actions';

const QUESTION_MAX = 300;

const STATUS: Record<string, string> = { pending: 'Waiting for the right moment', asked: 'Remi has asked', answered: 'Answered' };

export default async function QuestionsPage() {
  const { sb, householdId, user } = await requireFamily();
  const [{ data: h }, { data: questions }, { data: members }] = await Promise.all([
    sb.from('households').select('preferred_name').eq('id', householdId).single(),
    sb.from('family_questions').select('id, question, status, asked_by, asked_at, answered_memory_id, created_at, memory:memories!family_questions_answer_fk(title)')
      .eq('household_id', householdId).order('created_at', { ascending: false }),
    sb.from('household_members').select('user_id, display_name').eq('household_id', householdId),
  ]);
  const name = h?.preferred_name ?? '';
  const who = (id: string | null) => (members ?? []).find((m) => m.user_id === id)?.display_name ?? 'Someone';

  return (
    <div>
      <h1 className="f-h1">Ask {name} something</h1>
      <p className="mt-1 max-w-prose text-dim">Write what you&apos;d love to hear about. Remi works it into a conversation over the next days, at a natural moment, in its own words, and you&apos;ll find the answer under Story.</p>
      <form action={askQuestion} className="mt-6 flex gap-3">
        <input name="question" required maxLength={QUESTION_MAX} placeholder={`e.g. Ask ${name} about the 1971 war`} className="flex-1 rounded-lg border px-4 py-3" />
        <button className="rounded-lg bg-garden px-5 py-3 text-night">Ask</button>
      </form>
      <ul className="mt-8 space-y-3">
        {(questions ?? []).map((q) => {
          const memory = q.memory as unknown as { title: string } | null;
          return (
            <li key={q.id} className="rounded-xl border bg-surface p-4">
              <p className="text-lg">{q.question}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-dim">
                <span>{who(q.asked_by)}</span>
                <span className={`rounded-full px-2 py-0.5 ${q.status === 'answered' ? 'bg-leaf text-garden' : q.status === 'asked' ? 'bg-garden/25 text-ink' : 'bg-panel'}`}>{STATUS[q.status] ?? q.status}</span>
                {q.status === 'answered' && q.answered_memory_id && (
                  <Link href={`/family/story#m-${q.answered_memory_id}`} className="text-garden underline">{memory?.title ?? 'Hear the answer'}</Link>
                )}
                {q.status === 'pending' && q.asked_by === user.id && (
                  <form action={deleteQuestion} className="ml-auto"><input type="hidden" name="id" value={q.id} /><button className="text-alarm hover:underline">Remove</button></form>
                )}
              </div>
            </li>
          );
        })}
        {!questions?.length && <li className="text-dim">No questions yet.</li>}
      </ul>
    </div>
  );
}
