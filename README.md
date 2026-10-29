# Remi AI

**Remi keeps a life: their voice, their stories, for the people who love them.**

Remi is a companion for someone in the last chapter of their life — getting older, living with dementia, or facing a serious illness. It sits beside them on a tablet, talks with them every day, and gently draws out their life stories: childhood, marriage, work, recipes, regrets, advice, jokes. It keeps those stories in **their own recorded voice**.

While they are here, the family watches the stories arrive, sends questions ("ask Papa about the 1971 war"), adds old photos for Remi to ask about, and gets a quiet note when something seems wrong. After they are gone, the family can still **ask about them** and hear the answer in their own voice — and, if the person allowed it, talk with an AI that speaks the way they did.

Nothing is invented. In the default mode Remi only ever tells you what the person really said, and plays the clip.

## What it does

**For the person**
- Hands-free talk on a tablet: say "Remi" and talk. A little forest spirit listens.
- Remi is curious about their life, one gentle question at a time, never an interview.
- They decide who hears what, by voice: "only for my daughter", "after I'm gone", "give this to Riya on her wedding day".
- Their say over their own voice, asked once and changeable any time ("stop recording me").
- Reminders, check-ins, "Who is this?" with the family's photos, and the family's own words for hard questions — all the dementia-care features stay.

**For the family**
- **Story** — her life in chapters, in her words, with her voice. Mark anything that doesn't sound right.
- **Ask** — "What did Nani say about her wedding?" Remi answers only from what she said, and plays the clip. If she never told it, Remi says so.
- **Questions** — things you'd love to hear about; Remi works them into a conversation.
- **Photos** — old photos become prompts on the tablet.
- **Letters** — sealed memories open on their day, and reach people who have no account by a private link.
- **Care signals** — pain, breathlessness, fear, not eating, confusion building: a note to the family and the care team.
- **After** — the portal becomes a place to remember: a story a day, Ask, Letters, the Book, and (opt-in, always marked **AI**) *Talk with her*.
- **The book** — her story as an A5 book you can print; a code beside each memory plays her voice.
- **You keep everything** — one zip with every clip, every word, every photo, any time.

## Try it

The hosted demo opens a demo family (Avni Devi, 78, a retired Hindi teacher from Jaipur) that resets every day:

- **Open Avni's tablet** and tap **Start Remi** once. Then just talk: "Remi, let me tell you about my school." "Remi, what day is it?" Tap **Look at a photo** or **My stories**. (Chrome or Edge on a laptop or Android tablet.)
- **Open the family portal** — her story with clips, Ask, the questions queue, photos, what she sealed for later. Use **See after** at the top to flip the household to after she has passed, and back.

## How it's built

Next.js 16 on Vercel, Supabase (Postgres, Auth, Storage), Claude (`@anthropic-ai/sdk`) for talk, memory extraction, Ask and the persona, Azure neural voice for Remi's speech, three.js for the forest spirit. Row-level security decides who may hear each memory; audio is served only by short-lived signed links after that check.

```
npm install
cp .env.example .env.local   # fill in Supabase, ANTHROPIC_API_KEY, Azure, demo logins
npm run dev
npm test
npm run demo:clips           # voice for the demo memories (or drop your own in demo/clips/)
npm run seed:demo            # the demo family
```

Migrations live in `supabase/migrations/`; `supabase/tests/0005_visibility.sql` proves the visibility rules as two family members would see them.

## Known gaps

- New strings are English only for now; the tablet's 14 languages still work for talk.
- Voice cloning for *Talk with her* is not built; it uses a soft neutral voice.
- Nightly off-site backup of the audio is not built yet; **Keep everything** is the guarantee.
- Email (invites, letters, care alerts) needs `RESEND_API_KEY` and a verified domain; until then links are shown on screen.

MIT licence. Built by ADX Studios.
