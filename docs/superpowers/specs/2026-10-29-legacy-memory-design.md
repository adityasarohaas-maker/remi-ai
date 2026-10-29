# Remi: keeping a life — design

Date: 2026-10-29. Status: draft for approval.
Builds on: `2026-10-22-forest-design.md` (the look), the live app at remi-ai-lake.vercel.app.

## Intent

Remi started as a dementia companion built for a hackathon. The hackathon is dropped; Remi is going to Y Combinator with a bigger idea.

Remi sits beside someone in the last chapter of their life — an elderly person, someone with dementia, or someone with an incurable illness who may have a year left. It talks with them every day, listens to their life stories, and keeps them: their real voice, their real words. After they die, the family can still ask about them ("What did Papa say about his first job?") and hear the answer in his own recorded voice. It eases the pain of the death and keeps the person present.

Why it matters to the user: the loss of a person is also the loss of everything only they knew. Remi saves that while there is still time.

## Who it serves

- **The person** — company every day, someone who truly listens, and the dignity of choosing how they are remembered and who hears what.
- **The family** — while the person is alive: watch the stories arrive, send questions, add photos, get care alerts. After the death: ask Remi anything, hear the real clips, open sealed letters on the right day, keep a printed book.
- **Care teams (hospices, palliative care, old-age homes)** — care signals; later a sales channel. Not a separate product in this build.

## Goals

1. Remi gathers a life archive through daily conversation, with the person's **real audio** kept alongside the words.
2. After the death, family can ask about the person and get answers drawn **only** from what the person actually said, with the real clip played.
3. An opt-in **"Talk with them"** mode where an AI speaks as the person.
4. All dementia features stay and are adapted to the memory-keeping purpose.
5. The seven additions below all ship.
6. A seeded demo family that shows the whole loop in about two minutes for YC.

## Non-goals

- Legal wills or anything with legal force. Last wishes are recorded words, nothing more.
- Medical diagnosis or treatment advice. Care signals are "worth a look" alerts, not clinical judgments.
- Physical printing and shipping of books. We produce a print-ready PDF; fulfilment is later.
- Payments and billing.
- Video avatars or deepfake video.
- Native mobile apps. Tablet stays a web app (Chrome/Edge, Android best).
- Voice cloning (decided by the user: later, after YC). Talk with them uses text plus a soft Azure voice for now.
- New strings in languages other than English (decided by the user: English only for now). The existing 14-language tablet keeps working as it does.

## Anti-goals (a failure even if it works)

- An invented memory presented as something the person really said. In the default mode, nothing is ever made up; if they never spoke of it, Remi says so.
- A sealed or private memory reaching someone it was not meant for, or before its time.
- The archive being lost — by bug, by a provider deleting files, or by Remi the company going away.
- "Talk with them" ever pretending it is not an AI.
- The daily talks feeling like an interview or a form. They must feel like a friend who is curious about your life.

## The core loop

1. **Talk.** The tablet already listens hands-free (wake word, follow-ups, check-ins). Remi now steers some conversations toward life stories: gently, one topic at a time, following the person's lead, never quizzing.
2. **Record.** While the person speaks to Remi, the tablet records their audio (not Remi's) alongside the existing speech-to-text, and uploads it.
3. **Keep.** After each conversation, a model turns what was said into **memories**: a story unit with a title, the person's own words, the audio clip, when in their life it happened, the people and places in it, and any feelings or lessons. Each memory points at the exact clip and transcript it came from.
4. **Share.** Family sees new memories in the portal (respecting who may see what) and can react, correct, and ask follow-up questions.
5. **After.** When the family marks the person as passed, the portal changes into the remembering space: Ask, the life story, sealed letters, the book, and (if enabled) Talk with them.

## Features

### A. Remi remembers (default after-death mode)

Family asks a question in the portal by typing or speaking. Remi finds the matching memories and answers in its own voice ("She told me about this in March…") and plays the real clips. Every answer shows which memories it came from. If nothing matches: "He never told me about that. He did talk about…" and offers the closest thing. The answer never states facts that aren't in the memories.

This mode also works **while the person is alive**, for family who want to hear stories already gathered.

### B. Talk with them (extra, opt-in)

An AI that speaks as the person: their way of talking, their phrases, their opinions, drawn from the archive. It speaks in a soft Azure voice for now; voice cloning comes later.

- Turned on by the family. Families use it however they want.
- Defaults (my call; the user may remove either): the person gives consent while alive (recorded in the app — see Consent), and a small persistent "AI" tag is on screen.
- It may improvise in their style; that is the point of this mode. It still never claims to be a real recording.

### C. Family question queue (#1)

A family member writes a question ("Ask Papa about the 1971 war"). Remi works it into a conversation within the next days, at a natural moment, phrased its own way. When answered, the asker is notified and the memory is linked to their question. Family can see pending / answered.

### D. Old photos as prompts (#2)

Family uploads old photos, optionally with a note ("Wedding, 1968, Ajmer"). On the tablet, Remi shows one and asks about it. The story is kept as a memory linked to the photo. Faces already enrolled in People are recognised (existing face-match), so Remi can say "Is that Suresh?". The existing "Who is this?" cards also record the story behind each face.

### E. Private and timed memories (#3)

The person decides who hears what, by voice, in plain words: "Only for my daughter." "Only after I'm gone." "Give this to Riya on her wedding day." Remi confirms back what it understood.

Each memory has a visibility rule:
- everyone in the family
- only named family members
- after death only
- on a date, or on an event the family marks (e.g. "Riya's wedding")
- only Remi (the person wants to say it, not share it)

**Legacy letters** are messages the person records on purpose for someone, sealed until a date or event. They are the most important use of this feature.

Enforcement is in the database (row-level security), not just the UI. Sealed memories are not readable by family until their rule opens, even through the API.

### F. The life story and the book (#4)

Memories arrange themselves into a timeline and chapters (childhood, youth, marriage, work, children, later years — chapters follow the person's life, not a fixed list). Family can browse the timeline, read and listen. A **memory book** is generated as a print-ready PDF: chapters in the person's words, photos, and QR codes that open the audio clip. Only memories visible to "everyone" (and opened sealed ones) go in the book.

### G. Care signals (#5)

Remi already tracks mood. It now also notices pain, breathlessness, distress, fear, confusion getting worse, not eating, and asks a gentle follow-up when it hears them. Signals go to the family (existing alerts) with a short note and the time. Urgent words (already in safety.ts) still alert immediately. A family member can add a care-team contact who gets the same alerts.

### H. Last wishes (#6)

When the person wants to talk about it, and only then, Remi helps them say what they want: funeral and rituals, who should get which things, people to forgive or thank, things left unsaid. Kept as memories in a "wishes" chapter, usually private or after-death. The portal says plainly that these are not a legal will.

### I. You keep everything (#7)

Any admin family member can download the whole archive at any time: all audio, transcripts, memories as JSON, photos, and the book PDF, as one zip. The landing page and portal say this clearly. Files are kept in at least two places (storage + a periodic backup) — see Constraints.

## Dementia features, adapted

Everything existing stays: reminders, check-ins, hard-questions guidance (sensitive_guidance), scam/safety words, "Who is this?", evening note, telling family.

Changes:
- **Capture early.** For a dementia household, Remi prioritises the oldest and most precious memories first and leans into story-gathering more in the early months.
- **Consent at diagnosis.** At setup, the person (with family) chooses what is kept, who may hear it, and whether Talk with them is ever allowed — because later they may not be able to.
- **Shaky memories.** When the person seems confused, contradicts an earlier telling, or the dementia-aware check fires, the memory is marked *unsure*. Family can mark memories *true* or *unsure*. Unsure memories are never presented as fact in Remi remembers, and are left out of the book unless a family member confirms them.
- **Hear your own stories.** Later in the illness, Remi can play the person their own earlier recordings ("You told me this lovely story about your school…") as comfort.
- The evening note now also says which stories came up today.

## Consent

Recorded in the app, by voice on the tablet and confirmed in the portal at setup:
- that Remi may record and keep their voice
- default visibility of their memories
- whether Talk with them may be turned on after their death, and whether their voice may be cloned for it later (recorded now so cloning can be added without asking again)

Consent can be changed by the person any time by talking to Remi. For a person who can no longer consent, the family admin records who decided and when.

## After the death

A family admin marks the person as passed (date). The portal switches into remembering: Ask, life story, letters (opening as their rules allow), book, Talk with them (if allowed). The tablet stops daily talk; it can stay as a "listen to their stories" device. No proof of death is required in this build (my call — see open questions).

## How it gets made

Builds on the existing app: Next.js 16 on Vercel (bom1), Supabase (Postgres + Auth + Storage, project remi-ai), the forest design, three.js Kodi on the tablet, Azure neural voice for Remi's speech, 14 tablet languages (i18n.ts).

My calls:
- **The brain moves off NVIDIA/Nebius to Claude** (as Umiko already does). Live talk uses a fast model; memory extraction, the book and Talk with them use a stronger one. Keep the current "one wrapper, swap the model by env" shape (rename `nebius.ts`).
- **Audio:** MediaRecorder on the tablet, Opus/WebM, uploaded per turn to a private Supabase Storage bucket; served to family only through short-lived signed URLs after a visibility check.
- **Search for Ask:** Postgres full-text plus embeddings (pgvector) over memories. Builder may simplify to full-text if that proves enough for the demo.
- **Memory extraction** runs after each conversation ends (not on every sentence), plus a nightly pass that merges duplicates and fills the timeline.
- **New strings are English only** for this build (user's decision).

## Demo for YC

**Deadline: ready by 2 November 2026, with every feature in it** (user's decision). Build a working end-to-end slice of each feature first, then deepen it. Where depth must give way to the date, plain full-text search and a simple book layout are acceptable.

Seeded family (Avni Devi, 78, Jaipur — or a new terminally-ill demo person, builder's choice) with: ~30 memories with recorded clips. Some clips are spoken by the Azure voice and some are recorded by the user, so the seed needs an easy way to drop in the user's audio files and their transcripts, photos with stories, a pending and an answered family question, a sealed letter for a grandchild, care signals, a wishes chapter, a book PDF, and a switch to flip the household to "after" so judges can see both sides. Must work on a demo key, unrestricted.

## Constraints

- Supabase free tier: 1 GB storage. A year of daily talk is several GB of audio per person. The demo fits; real families will need a paid plan or another store. Builder: keep audio storage behind one interface.
- Health and end-of-life data, families worldwide: treat as sensitive (India DPDP Act, GDPR). Private bucket, RLS everywhere, no audio in logs.
- Existing hands-free listening relies on browser speech recognition; recording audio at the same time must not break it (test on Android Chrome).

## Calls made after the builder check (mine; the user may override)

- **Every family member gets their own login.** Admins invite people by email, and each person has a role: `owner`, `admin` or `family`. A household can have several admins. Visibility rules and row-level security work per person.
- **Letters can reach people who have no account.** When a letter's rule opens, the recipient gets a private, single-use link, which expires and can be re-sent by an admin. They can open the letter without signing up.
- **Language.** This build is English only. The data model still stores each memory's language and leaves room for a translation labelled "translated", so other languages can be added later without a migration. A translation is never presented as the person's own words.
- **Notifications.** Household alerts stay on Telegram. Care-team contacts and "your question was answered" go by email through Resend, which ADX already uses; its domain still needs verifying. WhatsApp comes later.
- **Passed is one-way for real households.** An admin can undo it within 24 hours, but only if no sealed item has opened yet. Anything opened stays opened, with the time it opened and who opened it. Demo households carry an `is_demo` flag and can be reset freely; real ones never share that path.

## Decided by the user

- Pivot to YC; drop NVIDIA/Nebius. Applying with both Remi and Umiko.
- Audience: elderly, dementia, and incurable illness.
- Default after-death mode is Remi remembers (real clips, nothing invented). Talk with them is an extra; families use it however they want.
- Dementia features stay, adapted.
- Build all seven additions.
- Demo ready by 2 November 2026 with all features; English only for now.
- Demo clips: some Azure voice, some recorded by the user.
- Voice cloning: later.

## Left to the builder

- Data model details, table names, migrations.
- Exact prompts for story-steering, extraction, Ask and Talk with them.
- Portal page layout within the forest design.
- How chapters are named and ordered.
- Book PDF layout.
- Backup mechanism for the archive.
- Order of work, as long as the demo loop works end to end first.
