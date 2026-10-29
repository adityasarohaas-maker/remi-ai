# Remi keeps a life — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Remi from a dementia companion into a life-keeper: it records the person's own voice, turns daily talk into memories, and lets family ask about them (and, opt-in, talk with them) after death, with all seven additions and the dementia features adapted.

**Architecture:** The existing Next.js 16 app on Vercel and Supabase stays. Pure logic goes in `src/core` and is tested with vitest using fake deps, which is the existing pattern. I/O goes in `src/lib`, and pages go in `src/app`. The database enforces who may see what through RLS: every family read goes through the user-scoped Supabase client, and audio comes only from short-lived signed URLs issued after an RLS-checked read. The brain moves from the OpenAI-compatible Nebius wrapper to `@anthropic-ai/sdk`.

**Tech Stack:** Next.js 16.4, React 19, Supabase (Postgres, Auth, Storage), `@anthropic-ai/sdk` + `zod` (structured outputs), Azure Speech (Remi's voice and demo clips), Resend (email), `fflate` (export zip, in the browser), `qrcode` (book), vitest, `tools/verify/shot.mjs` (headless screenshots).

**Spec:** `docs/superpowers/specs/2026-10-29-legacy-memory-design.md`

## Global Constraints

- Deadline: the demo is ready by **2 November 2026** with every feature in it. Build a working end-to-end slice of each feature first, then deepen it.
- **New strings are English only.** The existing 14-language tablet keeps working as it does.
- Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. This is Next 16; see AGENTS.md.
- Models: `CLAUDE_CHAT_MODEL` and `CLAUDE_DEEP_MODEL` env vars, both defaulting to `claude-opus-5-5`. Never send `temperature`. Never send `thinking: {type: "disabled"}`; control depth with `output_config.effort` (`low` for live chat, `high` for extraction, Ask, book and persona). Every call uses `client.beta.messages` with `betas: ["server-side-fallback-2026-07-01"]` and `fallbacks: "default"`, and checks `stop_reason === "refusal"`.
- Every new table has RLS enabled. Family reads use `supabaseServer()`, never `supabaseAdmin()`, unless the task says otherwise.
- Audio lives in the private bucket `voice`. Signed URLs live 600 s at most. Audio bytes and transcripts are never written to logs.
- Migrations are numbered from `0005`. The remote DB already has a `0004`, households.buddy, from the parked branch. Test RLS as `authenticated` inside `begin; … rollback;` before applying it live.
- Default after-death mode never states anything that isn't in a memory the viewer may see. "Talk with them" always shows the tag `AI`.
- The demo household (`DEMO_HOUSEHOLD_ID`) must keep working at remi-ai-lake.vercel.app with the demo login.
- Existing tests stay green: `npm test`.

## Review Focus

1. **Sealed memories reaching the wrong person** through Ask, Talk with them, the book, export, or the photo/question pages. Every one of these reads through RLS. Task 2 adds the SQL test, and Task 12 adds the Ask test showing that a sealed-only topic gives `nothingFound`.
2. **Ask citing memories it wasn't given.** The model returns ids outside the retrieved set. Unknown ids are dropped, and if none are left the answer becomes `nothingFound` (test in Task 12).
3. **Microphone contention on Android Chrome** between SpeechRecognition and MediaRecorder. If the recorder fails to start, talk continues without audio and nothing throws (test in Task 3).
4. **The person speaking Hindi even though new strings are English only.** Extraction keeps the original words and `language: 'hi'`, and nothing crashes (test in Task 5).
5. **Flipping "passed" back after a letter has opened.** `canUndoPassed` refuses it (test in Task 13).

---

### Task 1: Move the brain to Claude

**Files:**
- Create: `src/lib/claude.ts`, `scripts/claude-smoke.ts`, `tests/lib/claude.test.ts`
- Modify: `src/lib/deps.ts` (imports, `withBackup` → single model + one retry), `src/lib/digest.ts`, `src/core/talk.ts`, `src/core/companion-prompt.ts`, `src/core/digest-prompt.ts` (import `ChatMessage` from `@/lib/claude`), `package.json` (`smoke` → `claude-smoke.ts`; add `@anthropic-ai/sdk`, `zod`), `.env.example` (add `ANTHROPIC_API_KEY`, `CLAUDE_CHAT_MODEL`, `CLAUDE_DEEP_MODEL`; remove `NEBIUS_*`)
- Delete: `src/lib/nebius.ts`, `scripts/nebius-smoke.ts`

**Interfaces:**
- Produces:
  - `type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }` (same shape as today).
  - `MODELS = { chat(): string; deep(): string }`.
  - `toClaude(messages: ChatMessage[]): { system: string; messages: Anthropic.Beta.BetaMessageParam[] }`. It joins all system messages with `\n\n` and keeps user/assistant order.
  - `chatText(messages, opts: { model: string; maxTokens?: number; effort?: 'low'|'medium'|'high'; timeoutMs?: number; maxRetries?: number }): Promise<string>`.
  - `chatStream(messages, opts & { signal?: AbortSignal }, onDelta: (t: string) => void): Promise<string>`.
  - `chatJson<T>(messages, schema: z.ZodType<T>, opts): Promise<T>`, which uses `client.beta.messages.parse` with `output_config.format: zodOutputFormat(schema)` and throws if `parsed_output` is null or the stop reason is `refusal`.
- `ChatOpts` in `core/talk.ts` becomes `{ maxTokens: number; effort?: 'low'|'medium'|'high'; purpose?: 'story' }`, with `temperature` removed. Story replies use `MODELS.deep()` with effort `medium`.

- [ ] **Step 1: Write failing tests** in `tests/lib/claude.test.ts`:
  - `toClaude([{role:'system',content:'A'},{role:'system',content:'B'},{role:'user',content:'hi'},{role:'assistant',content:'yo'}])` returns `{ system: 'A\n\nB', messages: [{role:'user',content:'hi'},{role:'assistant',content:'yo'}] }`.
  - With no system message, `system` is `''`.
  - `MODELS.chat()` returns `'claude-opus-5-5'` when `CLAUDE_CHAT_MODEL` is unset.
- [ ] **Step 2:** `npx vitest run tests/lib/claude.test.ts` fails because the module is not found.
- [ ] **Step 3: Implement `src/lib/claude.ts`.**
  - Add `import 'server-only'`.
  - Create one lazily built `new Anthropic()`.
  - `chatStream` uses `client.beta.messages.stream(...)` and forwards `text_delta` events to `onDelta`.
  - The live chat path sends `output_config: { effort: 'low' }`.
  - Pass replies through `stripReasoning` as before.
- [ ] **Step 4: Rewire `deps.ts` and `digest.ts`** to `@/lib/claude`. Fix every caller that passed `temperature`, which is now a type error.
- [ ] **Step 5:** `npx vitest run` and `npx tsc --noEmit` both pass.
- [ ] **Step 6:** Write `scripts/claude-smoke.ts`, which sends one chat, one stream and one `chatJson` call with `z.object({ ok: z.boolean() })`. Run `npm run smoke`; it should print three OK lines. If `ANTHROPIC_API_KEY` is missing, stop and ask the user to put it in `.env.local` without pasting it in chat.
- [ ] **Step 7:** Commit with "Brain: Claude via @anthropic-ai/sdk (replaces Nebius)".

### Task 2: Schema for memories, voice, family roles and consent

**Files:**
- Create: `supabase/migrations/0005_legacy.sql`, `supabase/tests/0005_visibility.sql`, `src/core/visibility.ts`, `tests/core/visibility.test.ts`
- Modify: `src/core/types.ts`, adding `LifeStage`, `Visibility`, `MemoryKind`, `CareType`, `MemoryRule` (the visibility fields plus `household status` inputs) and `Memory` (a camelCase row of `memories` plus `recordingId`)

**Interfaces:**
- Produces these tables, with RLS on each:

  **`households`** gains:
  - `care_type text check in ('elderly','dementia','terminal') default 'elderly'`
  - `status text check in ('living','passed') default 'living'`
  - `passed_on date`, `passed_marked_at timestamptz`
  - `is_demo boolean default false`
  - `extracted_through bigint default 0` (last `events.id` turned into memories)

  **`household_members`** gains:
  - `display_name text`, `email text`
  - a role check limiting `role` to `owner`, `admin` or `family`

  **`invites`**: `id`, `household_id`, `email`, `display_name`, `role`, `token_hash unique`, `expires_at`, `accepted_at`

  **`recordings`**:
  - `id uuid`, `household_id`, `event_id bigint null`
  - `storage_path text`, `mime text`, `duration_ms int`
  - `transcript text`, `language text`, `created_at`

  **`memories`**:
  - Identity and content: `id uuid`, `household_id`, `title`, `summary`, `quote` (the person's own words), `language`, `translation null`
  - Clip: `recording_id null`, `clip_start_ms`, `clip_end_ms`
  - When in life: `life_stage text check in ('childhood','youth','marriage','work','parenthood','later','wishes','other')`, `year_from int null`, `year_to int null`
  - Who and where: `people text[]`, `places text[]`
  - Type: `kind text check in ('story','lesson','recipe','wish','letter')`
  - Truth flag: `confidence text check in ('sure','unsure') default 'sure'`, `verified_by uuid null`
  - Who may see it:
    - `visibility text check in ('everyone','members','after_death','on_date','on_event','remi_only') default 'everyone'`
    - `visible_to uuid[] default '{}'` (user ids)
    - `recipient_name`, `recipient_email`
    - `open_on date`, `open_event_id uuid null`
    - `opened_at timestamptz null`
  - Links: `question_id null`, `photo_id null`
  - Search: `search tsvector generated always as (to_tsvector('simple', coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(quote,'')||' '||coalesce(translation,''))) stored`, with a GIN index
  - `created_at`

  **`family_questions`**:
  - `id`, `household_id`, `asked_by uuid`, `question`
  - `status text check in ('pending','asked','answered') default 'pending'`
  - `asked_at`, `answered_memory_id`, `created_at`

  **`photos`**:
  - `id`, `household_id`, `storage_path` (in `family-media`), `note`, `year int null`
  - `uploaded_by`, `shown_at`, `created_at`

  **`life_events`**: `id`, `household_id`, `name`, `happened_on date null`. These are events like "Riya's wedding", which an admin marks as happened.

  **`care_signals`**: `id`, `household_id`, `kind text check in ('pain','breath','distress','fear','confusion','appetite')`, `detail`, `created_at`

  **`care_contacts`**: `id`, `household_id`, `name`, `email`

  **`consents`**:
  - `household_id pk`
  - `record_voice bool default true`, `default_visibility text default 'everyone'`
  - `allow_persona bool default false`, `allow_voice_clone bool default false`
  - `decided_by text check in ('person','family')`, `decided_by_name`, `recording_id null`, `decided_at`

  **`letter_links`**: `id`, `memory_id`, `token_hash unique`, `expires_at`, `used_at`

  **Functions, policies and the bucket:**
  - SQL function `public.can_see_memory(m public.memories) returns boolean`: security definer, stable.
  - Policy `memories_sel` uses it. Only the service role inserts or updates memories, except for the `confidence`/`verified_by` update, which goes through a security-definer RPC `verify_memory(id, confidence)`, members only.
  - Private bucket `voice`, path `{household_id}/{yyyy-mm-dd}/{uuid}.webm`, with **no** policies for `authenticated`. Only the service role reads or writes it, and family playback always goes through signed URLs issued server-side after an RLS-checked memory read.
- `src/core/visibility.ts`:
  - `memoryOpen(m: MemoryRule, ctx: { viewerId: string; status: 'living'|'passed'; today: string; happenedEventIds: string[] }): boolean` is the same rule as the SQL, used for labels and for tests.
  - `sealedLabel(m: MemoryRule, names: Record<string,string>): string` returns text such as "Sealed until 12 Feb 2027", "For Priya only", "Opens after she's gone", "Opens on Riya's wedding" or "Kept only with Remi".

**The rule** (SQL and TS must match):

```
open if member of household AND (
  visibility='everyone'
  OR (visibility='members'     AND viewer ∈ visible_to)
  OR (visibility='after_death' AND status='passed' AND (cardinality(visible_to)=0 OR viewer ∈ visible_to))
  OR (visibility='on_date'     AND today >= open_on AND (cardinality(visible_to)=0 OR viewer ∈ visible_to))
  OR (visibility='on_event'    AND event happened  AND (cardinality(visible_to)=0 OR viewer ∈ visible_to))
) ; 'remi_only' never open to anyone.
```

- [ ] **Step 1: Write failing `tests/core/visibility.test.ts`.** One case per visibility value, covering both open and sealed. Include these cases:
  - `remi_only` stays sealed even when the household is passed.
  - `members` stays sealed for a viewer who isn't in `visible_to`.
  - `on_date` opens on exactly `open_on`.
  - `sealedLabel` returns `"For Priya only"` for `members` with Priya's id.
- [ ] **Step 2:** Run it; it fails.
- [ ] **Step 3:** Implement `src/core/visibility.ts` and the types in `src/core/types.ts`.
- [ ] **Step 4:** Run the tests; they pass.
- [ ] **Step 5:** Write `0005_legacy.sql`. Then write `supabase/tests/0005_visibility.sql`: inside `begin; … rollback;` it creates two members and five memories, then `set local role authenticated` with each member's `request.jwt.claims`, and selects. Expected counts are written as `assert`s through a `do $$ … $$` block.
- [ ] **Step 6:** Apply the migration and the test to the remote `remi-ai` project (`utjyqykwekptiuxabiju`) with the Supabase MCP. Run `execute_sql` with the test file first; it should report no assertion failure. Then run `apply_migration` with `0005_legacy`, then `get_advisors` (security); the result should contain no new RLS warnings.
- [ ] **Step 7:** Commit with "Schema: memories, recordings, roles, consent, letters".

### Task 3: Record her voice on the tablet

**Files:**
- Create: `src/app/patient/[token]/recorder.ts`, `src/app/api/patient/recording/route.ts`, `src/core/recording.ts`, `tests/core/recording.test.ts`
- Modify: `src/app/patient/[token]/use-remi.ts` (start the recorder when speech starts; stop and upload on the final result; pass `recordingId` with the talk request), `src/app/api/patient/talk/route.ts` + `src/core/talk.ts` (accept `recordingId`, store it in the `conversation` event payload), `src/app/api/patient/today/route.ts` (return `recordVoice` from `consents`)

**Interfaces:**
- Produces:
  - `src/core/recording.ts`:
    - `MAX_CLIP_BYTES = 2_000_000`, `MAX_CLIP_MS = 90_000`, `ALLOWED_MIME = ['audio/webm', 'audio/ogg', 'audio/mp4']`
    - `clipPath(householdId: string, now: Date, id: string): string` returns `${householdId}/${yyyy-mm-dd}/${id}.webm` (the date is UTC)
    - `validateClip(mime: string, bytes: number): 'ok' | 'too_big' | 'bad_type'`
  - `recorder.ts`: `createRecorder(): { start(): Promise<boolean>; stop(): Promise<Blob | null> }`. `start` resolves to `false` and never throws when `getUserMedia` or `MediaRecorder` fails. It reuses one mic stream for the session.
  - `POST /api/patient/recording`: device-token auth (`requireDevice`), multipart fields `audio` (Blob), `transcript` and `language`. It returns `{ id }`, or `204` when consent says `record_voice=false`. The upload uses `supabaseAdmin().storage.from('voice')`. It is rate limited with `takeRateToken(h, 'recording', 30, 60)`.
- Consumes: `requireDevice` and `takeRateToken` (existing).

- [ ] **Step 1: Write failing tests:**
  - `clipPath('h1', new Date('2026-10-29T23:30:00Z'), 'abc')` returns `'h1/2026-10-29/abc.webm'`.
  - `validateClip('audio/webm', 2_000_001)` returns `'too_big'`.
  - `validateClip('video/mp4', 10)` returns `'bad_type'`.
  - In jsdom, with `navigator.mediaDevices` undefined, `createRecorder().start()` resolves to `false` (Review Focus 3).
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement `core/recording.ts`, `recorder.ts` and the route.
- [ ] **Step 4:** Wire `use-remi.ts`. Upload only for `addressed` and `followup` turns that got a reply, and never for ignored overheard speech, which matches the existing rule "ignored speech never saved". Remi's own voice isn't recorded because the recorder runs only while the person's speech is being recognised.
- [ ] **Step 5:** Run `npx vitest run` and `npx tsc --noEmit`; both pass.
- [ ] **Step 6:** Manual check on `localhost:3010/patient/<demo token>` in Chrome: speak one sentence. A row should appear in `recordings` and a file in the `voice` bucket. Check with the Supabase MCP `execute_sql`.
- [ ] **Step 7:** Commit with "Tablet records her voice per turn".

### Task 4: Remi steers toward stories, family questions and photos

**Files:**
- Create: `src/core/story-steer.ts`, `tests/core/story-steer.test.ts`
- Modify: `src/core/companion-prompt.ts` (a new `steer` input section and the persona line "you are curious about her life"), `src/core/mood.ts` (add `extractAsked(reply): { reply: string; questionId: string | null }` for an `ASKED: <id>` line, same shape as `extractTellFamily`), `src/core/talk.ts` (load the steer topic; mark the question asked), `src/core/types.ts` (`HouseholdContext` gains `careType`, `pendingQuestions: {id; question}[]`, `unshownPhoto: {id; note; url} | null`, `storyCoverage: Record<LifeStage, number>`), `src/lib/deps.ts` (`loadContext` fills them; adds `markQuestionAsked(id)` to `CoreDeps`)

**Interfaces:**
- Produces: `pickSteer(ctx: { careType; pendingQuestions; unshownPhoto; storyCoverage; minutesSinceLastStory: number }): Steer | null`. `Steer` is one of:
  - `{ kind: 'question'; id; text }`
  - `{ kind: 'photo'; id }`
  - `{ kind: 'stage'; stage: LifeStage }`
- **Order:**
  1. A pending family question.
  2. Otherwise an unshown photo, but only on the photo screen (Task 8 sets `unshownPhoto`).
  3. Otherwise the least-covered life stage. For `careType 'dementia'`, try `childhood → youth → marriage` first.
  4. Return `null` when `minutesSinceLastStory < 20`, so Remi doesn't keep pushing.
- Prompt rule: when a steer is present, Remi may raise it once, gently, at a natural moment, in its own words. When it raises a family question it writes a final line `ASKED: <id>`. When the person says who a story is for ("only for my daughter", "after I'm gone"), Remi repeats back what it understood in one short sentence.

- [ ] **Step 1: Write failing tests.**
  - `pickSteer` returns the question when one is pending.
  - For dementia with no coverage, it returns `{kind:'stage',stage:'childhood'}`.
  - It returns `null` at `minutesSinceLastStory: 5`.
  - `extractAsked('Tell me about the war?\nASKED: q1')` returns `{ reply: 'Tell me about the war?', questionId: 'q1' }`.
  - In `talk.test.ts`, a reply with `ASKED: q1` calls `markQuestionAsked('q1')` and the line isn't spoken.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run; they pass. `companion-prompt.test.ts` snapshots are updated deliberately.
- [ ] **Step 5:** Commit with "Remi steers gently toward life stories and family questions".

### Task 5: Turn conversations into memories

**Files:**
- Create: `src/core/extract.ts`, `src/lib/memories.ts`, `src/lib/email.ts`, `src/app/api/patient/conversation-end/route.ts`, `src/app/api/cron/memories/route.ts`, `tests/core/extract.test.ts`
- Modify: `vercel.json` (cron `/api/cron/memories` daily at 21:30 UTC), `src/app/patient/[token]/use-remi.ts` (after 3 minutes with no speech following a talk, POST `conversation-end` once)

**Interfaces:**
- Produces:
  - `MemoryDraftSchema` (zod) with these fields:
    - `title`, `summary`, `quote`, `language`, `translation` (nullable)
    - `turnIndexes: number[]` (which turns it came from)
    - `lifeStage`, `yearFrom`, `yearTo`, `people`, `places`
    - `kind`
    - `unsure: boolean`, `unsureReason` (nullable)
    - `visibility` (one of the six values)
    - `forNames: string[]`, `openOn` (ISO date, nullable), `openEventName` (nullable)
    - `answersQuestionId` (nullable), `photoId` (nullable)
  - `ExtractionSchema = z.object({ memories: z.array(MemoryDraftSchema) })`
  - `buildExtractionPrompt(input: { preferredName; careType; turns: {i; text; reply; mood; recordingId; photoId?}[]; pendingQuestions; people: Person[]; existingTitles: string[] }): ChatMessage[]`
  - `draftToRow(d: MemoryDraft, ctx: { householdId; turns; members: {userId; name}[]; events: {id; name}[]; consentDefault: Visibility }): MemoryRow`. It maps:
    - `forNames` to `visible_to` user ids. A name with no member account goes to `recipient_name`, and visibility becomes `after_death` or `on_date`, with a `letter` kind if requested.
    - `openEventName` to an existing `life_events` id, or `null`, in which case `lib` creates a new `life_events` row.
    - The first turn's `recordingId` to `recording_id`.
    - `confidence = d.unsure || turn mood === 'confused' ? 'unsure' : 'sure'`.
  - `lib/memories.ts`: `extractNewMemories(householdId: string): Promise<{ created: number }>`. It reads `conversation` events with `id > extracted_through` and stops if there are fewer than 2 turns. It calls `chatJson(…, ExtractionSchema, { model: MODELS.deep(), effort: 'high', maxTokens: 16000 })`, inserts rows, marks answered questions (`status='answered'`, `answered_memory_id`), emails the asker through `sendEmail`, and advances `extracted_through`. It is idempotent.
  - `src/lib/email.ts`: `sendEmail(to: string, subject: string, html: string): Promise<boolean>`, using Resend over `fetch` to `https://api.resend.com/emails` with `RESEND_API_KEY` and `EMAIL_FROM`. It returns `false`, logging only the subject, when the key is unset. Add both env names to `.env.example`. Later tasks reuse it.
  - `POST /api/patient/conversation-end`: device auth, rate 1 per 2 minutes, then `extractNewMemories`.
  - Cron route: `CRON_SECRET` auth like the existing digest cron, looping over households.
- Prompt rules (exact intent):
  - Only what the person said.
  - `quote` is copied verbatim from her words, trimmed and never paraphrased.
  - Skip small talk.
  - Merge the same story told twice into one memory and mark the second telling `unsure` if details conflict.
  - Detect visibility instructions in her own words.
  - `kind 'wish'` is for funeral, rituals, belongings and things left unsaid.

- [ ] **Step 1: Write failing tests:**
  - A draft with `forNames:['Priya']`, where Priya is a member, gives `visibility:'members'` and `visible_to:[priyaId]`.
  - `forNames:['Riya']` (not a member) with `openEventName:"Riya's wedding"` gives `visibility:'on_event'`, `recipient_name:'Riya'` and `kind:'letter'`.
  - A turn with mood `confused` gives `confidence:'unsure'`.
  - A Hindi draft (`language:'hi'`, quote in Devanagari) keeps the quote unchanged and `language:'hi'` (Review Focus 4).
  - `buildExtractionPrompt` includes the pending question ids and the instruction text "copy her words exactly".
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement `core/extract.ts` and `lib/memories.ts`, then the routes and the cron entry.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Live check: on the demo tablet, tell one short story, call `conversation-end`, and confirm with `execute_sql` that one `memories` row exists with a `recording_id`.
- [ ] **Step 6:** Commit with "Conversations become memories".

### Task 6: Family members, roles and invites

**Files:**
- Create: `src/core/roles.ts`, `tests/core/roles.test.ts`, `src/app/family/(portal)/members/{page.tsx,actions.ts}`, `src/app/invite/[token]/{page.tsx,actions.ts}`
- Modify: `src/lib/household.ts` (`requireFamily()` also returns `role` and `displayName`), `src/app/family/(portal)/layout.tsx` (nav)

**Interfaces:**
- Produces:
  - `type Role = 'owner'|'admin'|'family'`
  - `canAdmin(role: Role): boolean` (owner or admin)
  - `canInvite(role, invitedRole): boolean` (only an owner can make an admin)
  - `requireFamily(): Promise<{ sb; user; householdId; role: Role; displayName: string | null }>`
  - `requireAdmin()`, which redirects to `/family` if the user isn't an admin
- Invite flow: an admin enters a name, email and role. The server makes a 32-byte token, stores its hash (reusing `hashDeviceToken`) with a 7-day expiry, and emails the link through `sendEmail`. The invite link is also shown on screen to copy, because Resend's domain isn't verified yet. `/invite/[token]` has a sign-up-or-sign-in form, then adds a `household_members` row with `display_name` and `email`.

- [ ] **Step 1: Write failing tests** for `canAdmin` and `canInvite` (family can't invite an admin; owner can).
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement the core, then the pages.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Browser check: invite a second email from the demo account, open the link in a private window, sign up, and confirm the Members list shows both people.
- [ ] **Step 6:** Commit with "Family members, roles and invites".

### Task 7: The life story in the portal

**Files:**
- Create: `src/app/family/(portal)/story/{page.tsx,memory-card.tsx,actions.ts}`, `src/lib/clips.ts`, `src/core/chapters.ts`, `tests/core/chapters.test.ts`
- Modify: the portal nav (adds Story, Ask, Questions, Photos, Members), `src/app/family/(portal)/page.tsx` (Today shows "New stories this week" with up to 3 cards)

**Interfaces:**
- Produces:
  - `groupIntoChapters(memories: Memory[]): { stage: LifeStage; title: string; memories: Memory[] }[]`. Chapters are ordered childhood → youth → marriage → work → parenthood → later → other → wishes. Inside a chapter, memories are ordered by `yearFrom`, nulls last, then by `created_at`. Empty chapters are dropped. Default titles are "Childhood", "Growing up", "Marriage", "Work", "Raising a family", "Later years", "Other stories" and "Wishes".
  - `lib/clips.ts`: `signedClipUrl(sb: SupabaseClient, memoryId: string): Promise<string | null>`. It first selects the memory through `sb` (RLS). Only if a row comes back does it sign `recording.storage_path` with `supabaseAdmin()`, for 600 s.
  - Server actions `playClip(memoryId)` and `markMemory(memoryId, 'sure'|'unsure')`, which calls the RPC `verify_memory`.
- UI:
  - Each card shows the title, a quote in her words, the year, people, a play button, and a sure/unsure toggle. Unsure cards carry the label "Not sure this is accurate".
  - Sealed memories don't appear as cards. Instead there's a counter, "4 memories are sealed", taken from a security-definer RPC `count_sealed(household)` that returns only counts and labels per rule kind.

- [ ] **Step 1: Write failing tests** for `groupIntoChapters`: ordering, a null year sorting last, the `wishes` chapter coming last, and empty chapters being dropped.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement the core, `clips.ts`, the page and the actions.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Screenshot `/family/story` logged in as the demo account with `tools/verify/shot.mjs`. Cards should render and the play button should give an audio URL starting with the Supabase storage host.
- [ ] **Step 6:** Commit with "Portal: her life story".

### Task 8: Family question queue and old photos

**Files:**
- Create: `src/app/family/(portal)/questions/{page.tsx,actions.ts}`, `src/app/family/(portal)/photos/{page.tsx,actions.ts}`, `src/app/patient/[token]/screens/photo.tsx`, `src/app/api/patient/photo/route.ts`
- Modify: `src/app/patient/[token]/patient-app.tsx` (a `'photo'` screen, plus a Home tile "Look at a photo"), `src/app/patient/[token]/use-remi.ts` (send `photoId` with talk while on the photo screen), `src/core/talk.ts` (accept `photoId` and put it in the event payload), `src/app/patient/[token]/labels.ts` (English strings; other languages fall back to English)

**Interfaces:**
- Consumes: `pickSteer` (Task 4), `extractNewMemories` (Task 5, which links `photoId`), `faceGallery` and the existing face-match.
- Produces:
  - Questions page: add a question (max 300 characters), list pending / asked / answered, and link answered ones to the Story card. Anyone in the family can ask; the asker can delete while the question is still pending.
  - Photos page: upload to `family-media/{household}/photos/{uuid}.jpg`, under 8 MB, `image/*`, with an optional note and year. Grid shows "Story told" / "Not yet".
  - `GET /api/patient/photo`: device auth. It returns the next photo whose `shown_at` is null, then the oldest-shown one, as `{ id, url (signed 600 s), note }`, and sets `shown_at`.
  - Photo screen: a big photo. Remi opens with a line built from the note, e.g. "Priya added this photo — Wedding, 1968. Tell me about this day?". The person talks as normal, with `photoId` attached.
  - Faces: the photo screen runs the existing client-side face detection (the same `@vladmandic/human` setup as `screens/face.tsx`) on the shown image and posts the embeddings to the existing `/api/patient/identify`. Matched names go into the opening line ("Is that Suresh?").
  - On the existing Face ("Who is this?") screen, talk turns after a match carry `personName` in the event payload, so extraction lists that person in `people`.

- [ ] **Step 1: Write a failing test** in `talk.test.ts`: `handleTalk` with `photoId:'ph1'` logs `payload.photoId === 'ph1'`.
- [ ] **Step 2:** Run; it fails.
- [ ] **Step 3:** Implement the routes, pages and screen.
- [ ] **Step 4:** Run; it passes.
- [ ] **Step 5:** Browser check, using demo tablet screenshots with the fake SpeechRecognition injection (`shot.mjs JS=`): upload a photo, open the tablet photo screen, and confirm the photo and the opening line render.
- [ ] **Step 6:** Commit with "Family question queue and photo prompts".

### Task 9: Consent

**Files:**
- Create: `src/app/family/(portal)/consent/{page.tsx,actions.ts}`, `src/core/consent.ts`, `tests/core/consent.test.ts`
- Modify: `src/app/family/setup/{page.tsx,actions.ts}` (a care type choice: "Getting older", "Living with dementia", "A serious illness"; then redirect to consent), `src/app/patient/[token]/screens/home.tsx` (when `consents.decided_at` is null, Remi asks the consent question aloud once at Start and records the answer as a recording)

**Interfaces:**
- Produces:
  - `consentQuestion(name: string): string` returns: "Before we begin, {name}: may I keep your voice and your stories, so your family can hear them, now and later? You can tell me to stop keeping anything, any time."
  - `parseConsentAnswer(text: string): 'yes' | 'no' | 'unclear'`, covering English yes/no words and "हाँ"/"नहीं".
  - Consent page (admin only): four switches — keep voice, default visibility (everyone / after death), allow "Talk with them" after death, allow voice cloning later. It also has "Who decided": "{name} said so (recorded on the tablet)" with a play button, or "We decided for {name}" with the admin's name and the date.
  - `talk.ts`: when the person says "stop keeping" or "don't record", Remi confirms, sets `record_voice=false`, and alerts the family with reason `message`.

- [ ] **Step 1: Write failing tests:**
  - `parseConsentAnswer('yes you may')` returns `'yes'`.
  - `parseConsentAnswer('नहीं')` returns `'no'`.
  - `parseConsentAnswer('what?')` returns `'unclear'`.
  - In `talk.test.ts`, "please stop recording me" calls a new `CoreDeps.setRecordVoice(false)`.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Commit with "Consent: spoken on the tablet, confirmed in the portal".

### Task 10: Care signals

**Files:**
- Create: `src/core/care-signals.ts`, `tests/core/care-signals.test.ts`, `src/app/family/(portal)/profile/care-contacts.tsx`
- Modify: `src/core/talk.ts` (detect, log a `care_signals` row through new `CoreDeps.logCareSignal`, alert at most 2 per kind per 6 hours through `takeRateToken`), `src/core/companion-prompt.ts` (on a signal, ask one gentle follow-up), `src/lib/alerts.ts` (also email care contacts through `sendEmail`), `src/app/family/(portal)/page.tsx` (Today lists today's signals)

**Interfaces:**
- Produces: `detectCareSignals(text: string, mood: Mood, recentConfusedCount: number): CareKind[]`. It works from English word lists plus `mood`:
  - `pain`: hurts, pain, ache, sore
  - `breath`: can't breathe, breathless, short of breath
  - `distress`: crying, can't take it, want it to end
  - `fear`: scared, afraid, frightened
  - `appetite`: not hungry, didn't eat, can't eat
  - `confusion`: `recentConfusedCount >= 3` within the session window
  - It doesn't duplicate `detectSafetyWords` emergencies; those still alert immediately as before.

- [ ] **Step 1: Write failing tests:**
  - "my back hurts today" gives `['pain']`.
  - "I'm so short of breath" gives `['breath']`.
  - "I didn't eat lunch" gives `['appetite']`.
  - A third confused mood gives `['confusion']`.
  - "lovely day" gives `[]`.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement and wire it in.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Commit with "Care signals for family and care team".

### Task 11: Email, letters and timed memories opening

**Files:**
- Create: `src/core/letters.ts`, `tests/core/letters.test.ts`, `src/app/api/cron/open-letters/route.ts`, `src/app/letter/[token]/page.tsx`, `src/app/family/(portal)/story/events.tsx` (mark a life event as happened)
- Modify: `vercel.json` (cron daily at 03:30 UTC)

**Interfaces:**
- Produces:
  - `dueToOpen(m: MemoryRule & { opened_at: string | null }, ctx: { status; today; happenedEventIds }): boolean`, which uses `memoryOpen` from Task 2 with the viewer check skipped. It is true only when `opened_at` is null.
  - Cron: for each due memory it sets `opened_at`. Members in `visible_to`, or all members when the list is empty, get an email: "{name} left something for you". When `recipient_email` is set, it creates a `letter_links` row (hashed token, 30 days) and emails the link.
  - `/letter/[token]`: public. It looks up the hash with admin, checks it hasn't expired, and shows the letter's quote, title and clip (signed 600 s). It sets `used_at` on first open but stays readable until expiry.
  - Story page addition: "Coming later" lists sealed items by their `sealedLabel`, without content. Admins can add a recipient email to a sealed letter.

- [ ] **Step 1: Write failing tests:**
  - `dueToOpen` is true for `after_death` + passed + `opened_at` null.
  - It is false when `opened_at` is already set.
  - `on_event` is true only when the event id is in `happenedEventIds`.
  - `remi_only` is never due.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Call the cron locally with `CRON_SECRET`. With a demo letter `on_date` today, check that the letter link page renders the quote.
- [ ] **Step 6:** Commit with "Sealed letters and timed memories open on time".

### Task 12: Ask — Remi remembers

**Files:**
- Create: `src/core/ask.ts`, `tests/core/ask.test.ts`, `src/lib/ask.ts`, `src/app/family/(portal)/ask/{page.tsx,ask-form.tsx,actions.ts}`

**Interfaces:**
- Produces:
  - `AnswerSchema = z.object({ answer: z.string(), memoryIds: z.array(z.string()), nothingFound: z.boolean() })`
  - `buildAskPrompt(input: { preferredName; pronoun: 'she'|'he'|'they'; question: string; memories: { id; title; quote; summary; year; confidence }[] }): ChatMessage[]`. Rules in the prompt:
    - Remi speaks about the person in the third person, warmly, in at most 90 words.
    - It uses only the given memories and quotes their words.
    - It says "she wasn't sure / we're not certain" for `unsure` memories.
    - If nothing fits, it says she never told Remi about that and offers the closest memory titles.
  - `cleanAnswer(raw: Answer, retrievedIds: string[]): Answer`. It drops ids not in `retrievedIds`. If no ids remain and `nothingFound` is false, it returns `{ answer: raw.answer, memoryIds: [], nothingFound: true }`.
  - `lib/ask.ts`: `askRemi(sb: SupabaseClient, householdId: string, question: string): Promise<Answer & { clips: { memoryId; title; url }[] }>`.
    - Retrieval runs through `sb` (RLS): `search @@ websearch_to_tsquery('simple', q)`, limit 12. If there are fewer than 3 hits, it adds the 12 newest visible memories.
    - The answer comes from `chatJson` with the deep model at effort `high`, then `cleanAnswer`.
    - Clips come from `signedClipUrl`.
  - Ask page: a question box (typed; a mic button uses the browser SpeechRecognition when present), and an answer card with the cited memories and their play buttons. Available both while the person is living and after.

- [ ] **Step 1: Write failing tests:**
  - `cleanAnswer({answer:'x', memoryIds:['m9'], nothingFound:false}, ['m1','m2'])` returns `nothingFound: true` with `memoryIds: []` (Review Focus 2).
  - `cleanAnswer` keeps the valid ids from `['m1','m9']`.
  - The `buildAskPrompt` output contains each memory id and the phrase "only these memories".
  - Integration-style, with a fake `sb` that returns only open memories: a question about a sealed-only topic gets an empty retrieval and the model isn't called. Expect `nothingFound: true` and the fallback text "She never told me about that." (Review Focus 1).
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Live check on the demo with the question "What was her wedding like?". The answer should cite at least one seeded memory, and a clip should play.
- [ ] **Step 6:** Commit with "Ask: Remi remembers, in her own words".

### Task 13: After the death

**Files:**
- Create: `src/core/passed.ts`, `tests/core/passed.test.ts`, `src/app/family/(portal)/profile/passed.tsx`, `src/app/patient/[token]/screens/stories.tsx`
- Modify: `src/app/family/(portal)/layout.tsx` (when passed, nav becomes Remember · Ask · Story · Letters · Talk with {name} · Book · Members; the header shows "In memory of {name}, {passed_on}"), `src/app/patient/[token]/patient-app.tsx` + `src/app/api/patient/today/route.ts` (when passed, the tablet shows only the Stories screen: a list of 'everyone' memories with play, and no daily talk)

**Interfaces:**
- Produces:
  - `canUndoPassed(h: { status; passed_marked_at: string | null; is_demo: boolean }, anyOpenedSince: boolean, now: Date): boolean`. It is true when `is_demo`, or when `status==='passed'` and `now - passed_marked_at < 24h` and `!anyOpenedSince`.
  - Actions:
    - `markPassed(date)` is admin only and asks for a typed confirmation of the person's name.
    - `undoPassed()` checks `canUndoPassed` server-side.
- The stories screen also serves "Hear your own stories" while the person is living (Home tile "My stories"). Remi offers it through the prompt when `careType==='dementia'` and the person seems low.

- [ ] **Step 1: Write failing tests:**
  - Undo is allowed at 23 h with nothing opened.
  - Undo is refused at 23 h when something has opened (Review Focus 5).
  - Undo is refused at 25 h.
  - Undo is always allowed when `is_demo`.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Commit with "After the death: remembering mode".

### Task 14: Talk with them (extra, opt-in)

**Files:**
- Create: `src/core/persona-prompt.ts`, `tests/core/persona-prompt.test.ts`, `src/app/family/(portal)/talk-with/{page.tsx,chat.tsx}`, `src/app/api/family/persona/route.ts`

**Interfaces:**
- Consumes: `chatStream` (Task 1), `azure-tts` (existing; a soft voice matching the person's gender and language from `voices.ts`), and visible memories via `sb`.
- Produces:
  - `buildPersonaPrompt(input: { name; about; memories: { title; quote; year }[]; viewerName: string }): string`.
    - It speaks as {name} in the first person, using their phrases from the quotes, and may improvise in their style.
    - If asked whether it's real, it says it is an AI made from {name}'s stories.
    - It never makes promises about the real world, and in a crisis it points the viewer to real people.
    - Prompt input: at most 120 memories, newest-verified first. Unsure ones are left out.
  - `POST /api/family/persona`: family session auth, then 403 unless `consents.allow_persona && status==='passed'`. It streams NDJSON `{ say, audio }` like `talk`, at a rate of 20/min per household. Turns are stored as `events` of type `persona` and never become memories.
  - Page: a chat with a persistent tag `AI` next to the name, and a one-time intro card explaining what this is, with a "Turn off for me" switch (per user, `localStorage`).

- [ ] **Step 1: Write failing tests:**
  - The prompt contains the name, at least one quote, and the sentence "If someone asks whether you are real".
  - Unsure memories are excluded.
  - A list of 200 memories is cut to 120.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Commit with "Talk with them (opt-in, always labelled AI)".

### Task 15: Last wishes and dementia adaptations

**Files:**
- Modify: `src/core/companion-prompt.ts`, `src/core/story-steer.ts`, `src/core/digest-prompt.ts`, `src/lib/digest.ts`, and `src/app/family/(portal)/story/page.tsx` (a Wishes chapter carrying the notice "These are {name}'s wishes in their own words. They are not a legal will.")
- Test: `tests/core/companion-prompt.test.ts`, `tests/core/digest-prompt.test.ts`, `tests/core/story-steer.test.ts`

**Interfaces:**
- `companion-prompt`: a new input `wishesOpen: boolean`, set by talk when the text matches `/\b(when i('m| am) gone|my funeral|after i die|my last wish|my will)\b/i`. While it's set, Remi listens, helps them say it, and never steers toward wishes on its own. `pickSteer` never returns a `wishes` stage.
- `digest-prompt`: a new input `storiesToday: string[]` (memory titles). The evening note includes one line, "Today {name} told me about …", when the list isn't empty.
- Dementia: `pickSteer` already prioritises early stages (Task 4), and `unsure` comes from Task 5. This task adds the prompt line for `careType==='dementia'`: "Never correct her memories; if a story changes, just listen."

- [ ] **Step 1: Write failing tests:**
  - With `wishesOpen` true, the prompt contains "help them say it".
  - The digest prompt includes the story titles.
  - `pickSteer` never returns `'wishes'`.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Commit with "Last wishes and dementia adaptations".

### Task 16: The memory book and "You keep everything"

**Files:**
- Create: `src/app/family/(portal)/book/page.tsx` (print-ready), `src/app/family/(portal)/book/print.css`, `src/app/family/(portal)/export/{page.tsx,export-button.tsx}`, `src/app/api/family/export-manifest/route.ts`, `src/core/book.ts`, `tests/core/book.test.ts`
- Modify: `package.json` (add `qrcode`, `fflate`)

**Interfaces:**
- Produces:
  - `bookMemories(memories: Memory[]): Memory[]`. It keeps `visibility==='everyone'` memories plus opened ones (`opened_at` not null), drops `unsure` unless `verified_by` is set, and drops `remi_only`. Then it applies `groupIntoChapters`.
  - Book page: an A5 print layout with a cover (name, years, photo) and one chapter per page break. Each memory shows its quote in large type, the year, and a QR code linking to `/family/story#m-{id}`, which needs a login. There's a "Save as PDF" button calling `window.print()`. My call: the browser makes the PDF, because headless Chrome on Vercel is too heavy for the deadline.
  - `GET /api/family/export-manifest`: admin only. It returns JSON listing all memories visible to this admin, transcripts, photo and audio signed URLs (600 s), and consent. The browser fetches each file and zips it with `fflate` as `remi-{name}-{date}.zip`, containing:
    - `memories.json`
    - `transcripts/*.txt`
    - `audio/*.webm`
    - `photos/*`
    - `book.html` (a saved copy of the book page)

    The export page warns that this can take a few minutes.
  - Backup: a nightly cron copying new `voice` objects to Vercel Blob is **deferred until after 2 November**, written in the README as a known gap. The export button is the guarantee for the demo.

- [ ] **Step 1: Write failing tests** for `bookMemories`: it excludes `remi_only`, unverified `unsure` and sealed-unopened memories, and includes an opened letter.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run; they pass.
- [ ] **Step 5:** Browser check: open `/family/book`, use print preview to save a PDF, and confirm the chapters and QR codes appear. Run Export on the demo and confirm the zip contains `memories.json` and at least one audio file.
- [ ] **Step 6:** Commit with "Memory book and full export".

### Task 17: Demo family and YC polish

**Files:**
- Create: `demo/memories.json` (about 30 memories for Avni Devi, 78, Jaipur: stories across all chapters, 2 wishes, 1 sealed letter for granddaughter Riya `on_event` "Riya's wedding", 1 `after_death` letter for Priya, 1 `remi_only`, 3 `unsure`), `demo/clips/README.md` (how the user drops in their own recordings: `demo/clips/<memory-key>.webm|.mp3|.m4a` overrides the generated one), `scripts/make-demo-clips.ts` (generates missing clips with Azure TTS, using an older female Hindi-English voice from `voices.ts`)
- Modify:
  - `src/lib/demo-seed.ts`: seeds members Priya (owner, the demo login) and Arjun (family); `is_demo=true`; consents (person decided, persona allowed); 4 photos with notes; questions (1 pending, 1 answered); 3 care signals; and uploads clips to `voice`.
  - `src/app/demo-actions.ts`: adds "See after" / "Back to before" toggles, shown only when `is_demo`.
  - `src/app/page.tsx` + `README.md`: the new pitch line, "Remi keeps a life: their voice, their stories, for the people who love them", with features described in English only. The ADX credit stays.
  - `src/app/api/cron/reset-demo/route.ts`: resets the new tables.

- [ ] **Step 1:** Write the content of `demo/memories.json`. Quotes are first-person, natural and specific (places in Jaipur, the school she taught at, Lata songs, rajma, roses).
- [ ] **Step 2:** Run `npx tsx --env-file=.env.local scripts/make-demo-clips.ts`; it should report "30 clips ready (N generated, M user-recorded)".
- [ ] **Step 3:** Run `npm run seed:demo`, then check row counts with `execute_sql`: about 30 memories and 4 photos.
- [ ] **Step 4:** Walk the whole loop in the browser and take a screenshot of each step:
  1. Tablet photo prompt
  2. Story page with clips
  3. Questions page (one answered)
  4. Ask "What was her wedding like?"
  5. "See after"
  6. Letters (Priya's opens; Riya's still sealed)
  7. Talk with Avni, with the AI tag visible
  8. Book
  9. Export
- [ ] **Step 5:** `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass.
- [ ] **Step 6:** Commit with "Demo family for YC".
- [ ] **Step 7:** Ask the user before pushing to `main`, which auto-deploys through Vercel. After deploy, add `ANTHROPIC_API_KEY`, `CLAUDE_*`, `RESEND_API_KEY` and `EMAIL_FROM` to the Vercel env (the user adds the secrets), then repeat the Step 4 walk against `https://remi-ai-lake.vercel.app`.
