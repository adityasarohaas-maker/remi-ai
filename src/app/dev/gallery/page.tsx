import { notFound } from 'next/navigation';
import { PortalShell } from '@/app/family/(portal)/shell';
import { MemoryCard } from '@/app/family/(portal)/story/memory-card';
import type { Memory } from '@/core/types';

const NAV = [['/dev/gallery', 'Today'], ['/family/story', 'Story'], ['/family/ask', 'Ask'], ['/family/questions', 'Questions'], ['/family/photos', 'Photos'], ['/family/people', 'People'],
  ['/family/routine', 'Routine'], ['/family/guidance', 'Hard questions'], ['/family/tablet', 'Tablet'], ['/family/members', 'Members'], ['/family/consent', 'Her say'], ['/family/profile', 'Profile']] as const;

const SAMPLE: Memory = {
  id: 'sample', householdId: 'sample', kind: 'story', title: 'The monsoon wedding', language: 'en',
  quote: 'It rained so hard the band played under the mandap with us, and your grandfather said it was the gods clapping.', translation: null,
  summary: 'Her wedding day in 1968, in the rain, with the band crowded under the canopy.', people: ['Dadaji'], places: ['Rohtak'],
  recordingId: 'sample', clipStartMs: null, clipEndMs: null, lifeStage: 'marriage', yearFrom: 1968, yearTo: null,
  confidence: 'sure', verifiedBy: null, visibility: 'everyone', visibleTo: [], openOn: null, openEventId: null, openedAt: null,
  recipientName: null, recipientEmail: null, questionId: null, photoId: null, createdAt: '2026-10-29T10:00:00Z',
};

/** A development-only page: the portal shell with sample content, so the design can be checked without a database. */
export default function GalleryPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <PortalShell name="Avni" passed={false} nav={NAV} banner={<div><span>Demo family. This is the portal while Avni is here.</span><form><button type="button">See after</button></form></div>}>
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section>
          <h1 className="f-h1">Evening note</h1>
          <article className="mt-3 max-w-prose rounded-xl border bg-surface p-5 leading-relaxed">
            <h3 className="font-semibold text-garden">A good day</h3>
            <p className="mt-1">Avni slept until seven, had her tea on the balcony, and told Remi about the monsoon wedding again, with a new detail about the band.</p>
            <ul className="mt-1 list-disc space-y-1 pl-5"><li>Took the morning tablets at 8:10</li><li>Asked for Priya twice</li></ul>
          </article>
          <button className="mt-3 rounded-lg bg-garden px-4 py-2 text-night">Write tonight&apos;s note now</button>
          <h2 className="mt-10 f-h2">New stories this week</h2>
          <div className="mt-3 space-y-3"><MemoryCard m={SAMPLE} name="Avni" /></div>
          <h2 className="mt-10 f-h2">A form</h2>
          <form className="mt-3 max-w-xl space-y-4">
            <label className="block">What they like to be called<input defaultValue="Avni" className="mt-1 w-full rounded-lg border px-4 py-3" /></label>
            <label className="block">Who hears new stories<select className="mt-1 w-full rounded-lg border px-3 py-2"><option>The whole family, as they are told</option><option>Only after she&apos;s gone</option></select></label>
            <label className="flex items-start gap-3"><input type="checkbox" defaultChecked className="mt-1" /><span><b>Keep Avni&apos;s voice.</b><br /><span className="text-sm text-dim">Her side of each conversation is recorded.</span></span></label>
            <div className="flex gap-4"><button type="button" className="rounded-lg bg-garden px-5 py-3 text-night">Save</button><button type="button" className="underline">Cancel</button></div>
          </form>
        </section>
        <aside>
          <h2 className="f-h2">Alerts</h2>
          <ul className="mt-3 space-y-2">
            <li className="rounded-xl border-l-4 border-alarm bg-surface p-3"><p className="font-medium">Pressed “I need help”</p><p className="text-sm text-ink">Said she felt dizzy after standing up.</p><p className="mt-1 text-xs text-dim">4:12 pm</p></li>
          </ul>
          <h2 className="mt-8 f-h2">Worth a look</h2>
          <ul className="mt-3 space-y-2">
            <li className="rounded-xl border-l-4 border-marigold bg-surface p-3"><p className="font-medium">Pain mentioned</p><p className="text-sm text-ink">“My knee has been sore and stiff since Tuesday.”</p><p className="mt-1 text-xs text-dim">11:40 am</p></li>
          </ul>
          <p className="mt-6 rounded-xl border border-garden/40 bg-garden/10 p-4 text-sm">Talking with an AI made from her stories. It is not her, and it is always marked as AI.</p>
        </aside>
      </div>
    </PortalShell>
  );
}
