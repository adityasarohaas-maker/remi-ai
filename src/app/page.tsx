import Link from 'next/link';
import { startDemo } from './demo-actions';

const MORNING = [
  { time: '8:20 am', ask: 'What day is it?', answer: 'It’s Saturday, Kamla. The roses are out this morning.' },
  { time: '9:10 am', ask: 'What day is it?', answer: 'It’s Saturday. Priya is making poha for breakfast.' },
  { time: '10:05 am', ask: 'What day is it today?', answer: 'Saturday — a slow, sunny one. Shall we water the roses later?' },
];

const FEATURES = [
  {
    title: 'Who is this?',
    body: 'Point the tablet at a visitor. Remi names them from photos the family added, and gives a gentle hint about what to talk about. If it is not sure, it says so — and offers to ask the family.',
  },
  {
    title: 'Your words for the hard questions',
    body: 'When she asks for someone who has passed away, Remi answers the way the family decided in advance: a happy memory, a gentle change of subject, or a call from a relative.',
  },
  {
    title: 'An evening note for the family',
    body: 'Every evening the family gets a short note: how the day went, the questions she asked most, any missed medicine, and anything to keep an eye on. Words like “fell” or “scared” alert the family straight away.',
  },
];

export default function Landing() {
  const tabletToken = process.env.DEMO_DEVICE_TOKEN;
  return (
    <main className="bg-paper text-ink">
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <p className="text-xl font-semibold text-garden-deep">Remi AI</p>
          <h1 className="mt-6 max-w-[16ch] text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            The tenth time she asks, Remi answers like it’s the first.
          </h1>
          <p className="mt-6 max-w-[52ch] text-xl leading-relaxed text-ink/80">
            A calm tablet companion for people living with dementia — built around their own family, their own memories,
            and the words their family chooses for the hardest moments.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {tabletToken && (
              <Link href={`/patient/${tabletToken}`} className="rounded-2xl bg-garden px-7 py-4 text-lg font-semibold text-paper hover:bg-garden-deep">
                Open Kamla’s tablet
              </Link>
            )}
            <form action={startDemo}>
              <button className="rounded-2xl border-2 border-garden px-7 py-4 text-lg font-semibold text-garden-deep hover:bg-leaf">
                Open the family portal
              </button>
            </form>
          </div>
          <p className="mt-4 text-sm text-ink/60">
            {tabletToken ? 'Both open' : 'Opens'} a demo family that resets every day. <Link href="/login" className="underline">Create your own family account</Link>.
          </p>
        </div>

        <ol className="self-center rounded-[2rem] bg-white p-6 shadow-[0_1px_0_#dce5d6] sm:p-8" aria-label="One morning with Remi">
          {MORNING.map((m) => (
            <li key={m.time} className="border-b border-leaf py-5 first:pt-0 last:border-0 last:pb-0">
              <p className="text-sm tabular-nums text-ink/55">{m.time}</p>
              <p className="mt-1 text-lg">Kamla: {m.ask}</p>
              <p className="mt-1 text-xl font-semibold text-garden-deep">{m.answer}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-leaf bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title}>
              <h2 className="text-2xl font-bold">{f.title}</h2>
              <p className="mt-3 leading-relaxed text-ink/80">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-ink/70 sm:px-8">
        <p>
          Runs on NVIDIA Nemotron open models through Nebius Token Factory. Face photos stay in the family’s own private
          storage and are never sent to an AI model. Remi never gives medical advice and never pretends to be a family member.
        </p>
      </footer>
    </main>
  );
}
