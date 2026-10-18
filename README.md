# Remi AI

**The tenth time she asks, Remi answers like it's the first.**

Remi AI is a calm tablet companion for people living with dementia, and a private portal for the family who cares for them. It recognises loved ones, answers repeated questions patiently in the person's own language, follows the family's own words for painful questions, reminds about medicines and meals, and sends the family an evening note.

Built for the **Nebius × NVIDIA Global AI Hackathon 2026** — Personal AI track.

## NVIDIA models used (via Nebius Token Factory)

| Job | Model | Why |
| --- | --- | --- |
| Live conversation and "Who is this?" replies | **NVIDIA Nemotron 3.5 Lightning** (`NEBIUS_CHAT_MODEL`) | Fast and low-cost — suited to an always-on companion |
| Evening family note | **NVIDIA Nemotron 3 Super** — `nvidia/nemotron-3-super-120b-a12b` (`NEBIUS_REPORT_MODEL`) | Stronger reasoning over a whole day of events |

All model calls go through Nebius Token Factory's OpenAI-compatible API (`https://api.tokenfactory.nebius.com/v1/`) from server code only — see `src/lib/nebius.ts`.

## Try it

The hosted demo opens a demo family (Kamla, 78, from Jaipur) that resets every day:

- **Open Kamla's tablet** and tap **Start Remi** once. Then just talk: "Remi, what day is it?", "Remi, where is my husband?", "Remi, who is this?" (Chrome or Edge on a laptop or Android tablet; other browsers get the buttons and a text box.) Add `?quiet=1` to the tablet link to hear Remi check in after one quiet minute.
- **Open the family portal** — see the people, routine and hard-question guidance the family wrote, the alerts, the conversation log, and ask Remi to write today's evening note.

## Hands-free Remi

After one tap, Remi runs on its own, like a smart speaker that knows the family:

- **Always listening, answers when spoken to.** Saying "Remi" (or "रेमी") wakes it; anything said in the few seconds after Remi speaks may be a reply, and Remi answers or stays quiet. Remi pauses its microphone while speaking, so it never hears itself.
- **Joins in now and then.** Overheard questions about the day, a family member, or signs of confusion ("I want to go home") may get a gentle answer, at most once every three minutes. Ordinary chatter is ignored and **never saved or sent anywhere**.
- **Acts on safety words even when not addressed.** "I fell" or "दर्द" alerts the family straight away.
- **Speaks routine reminders by itself** and hears "done", "yes" or "हो गया" to tick them off.
- **Checks in after a long quiet spell** during the day (never 9 pm–7 am), with a short, warm line.
- **Voice shortcuts**: "Remi, who is this?" opens the camera and looks; "Remi, what's my day?" shows the routine.
- **Works without the model too.** The clock answers "what day is it?", the family's own words answer hard questions, and safety alerts never depend on Nemotron.

## How it works

```
 Tablet (/patient/<device-token>)          Family portal (/family, Supabase Auth)
   voice in/out (Web Speech API)              people + face photos, routine,
   face embedding computed IN THE BROWSER     hard-question guidance, tablet links,
   (Human, faceres) ─ photo never uploaded    alerts, conversation log, evening note
            │                                            │
            ▼                                            ▼
   /api/patient/*  ──────────►  src/core/*  (pure, unit-tested logic)
            │                    talk · identify · safety words · family guidance
            │                    reminders · day summary · prompts
            ▼
   Supabase (Postgres + RLS + private storage)    Nebius Token Factory      Telegram
   events log, people, embeddings, routine        Nemotron 3.5 Lightning    family alerts +
                                                  Nemotron 3 Super          evening note
```

- **Face recognition never guesses.** Embeddings are matched on our server by cosine similarity and need both a high score and a clear lead over the next person; otherwise Remi says "I'm not sure who this is — shall I ask Priya?". Photos are never sent to a language model.
- **The family's words come first.** When a question touches a topic the family wrote guidance for, their script and chosen approach (share a memory, gently redirect, or ask a relative to call) go into the prompt, and the turn is flagged in the portal.
- **Safety words alert the family immediately** — pain, fell, lost, scared (and Hindi equivalents) — by Telegram and in the portal.
- **Every interaction is an event** (conversation, mood, face query, reminder done, alert). The evening note is written by Nemotron 3 Super only from facts computed from that log.

## Safety and ethics

- Short, calm sentences; one idea at a time. Remi never argues with or harshly corrects the person.
- Remi never pretends to be a family member. No voice cloning.
- No medical advice or diagnosis. The evening note is observations only.
- Face data and memories stay in the family's own private Supabase project.
- Each household is isolated by Postgres row-level security; tablets use revocable per-device links.

## Run it locally

Requirements: Node 24, a Nebius Token Factory API key, a Supabase project.

```bash
npm install
cp .env.example .env.local        # then fill in the values below
```

1. **Nebius:** put your key in `NEBIUS_API_KEY`, then run `npm run smoke` to list the NVIDIA models on your key and check both model IDs respond.
2. **Supabase:** create a project, then run `supabase/migrations/0001_core.sql` and `0002_rls.sql` in order (SQL editor or `supabase db push`). Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key) and `SUPABASE_SERVICE_ROLE_KEY`. In Authentication → Sign In / Providers → Email, turn off **Confirm email** so families can sign up without an SMTP setup.
3. **Alerts (optional):** create a bot with @BotFather and set `TELEGRAM_BOT_TOKEN`; each family pastes its chat id in Profile.
4. **Demo family (optional):** set `DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_DEVICE_TOKEN` (any long random string) and run `npm run seed:demo`.
5. `npm run dev` and open http://localhost:3000.

Tests: `npm test` (Vitest — all product logic in `src/core` is unit-tested with fakes for Supabase and Nebius).

Daily jobs (`vercel.json`): `/api/cron/digest` writes and sends evening notes at 20:00 IST; `/api/cron/reset-demo` resets the demo family. Both require `Authorization: Bearer $CRON_SECRET`.

## Feedback on Nebius and NVIDIA tools

Notes from building Remi — measured latencies and observations are recorded here as the build is tested against the live API.

- **Nebius Token Factory:** the OpenAI-compatible endpoint meant the standard `openai` SDK worked with only a `baseURL` change, which made it quick to wire into a Next.js server.
- **NVIDIA Nemotron:** splitting work between a fast model for live talk and a stronger model for the once-a-day note kept the always-on part cheap.

## License

MIT — see [LICENSE](LICENSE). The demo family's face embeddings in `src/demo/embeddings.json` come from team members who consented to appear in the demo.
