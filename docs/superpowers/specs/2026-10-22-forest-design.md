# Remi: the forest design

A design for the public website, the sign-in page, the family portal and the tablet's inner screens. The product name "Remi" is a placeholder throughout: the real name is still being chosen (it must be one word with its own `.ai` domain), and every string that shows the name must come from one constant so the rename is a one-line change.

Reference prototypes, in `docs/design/prototypes/`:

- `landing-and-signin.html`: the approved landing page, built in three.js. Open it with `?mode=signin` for the sign-in page. This file is the source of truth for every visual and timing described below; where this document and the file differ, the file wins.
- `portal-and-tablet.html`, with `portal-and-tablet.png`: the family portal's Today page by day and by night, and two tablet screens. The portal's forest here is a drawn placeholder; see "Portal" for what it becomes.
- `signin-email.jpg`, `signin-pass.jpg`: Remi reacting to the sign-in form.

## Intent

Remi is a companion for people living with dementia, and a window onto their day for the family. The website has to feel premium, modern, easy and alive, and it must be recognisably ours. The user showed openai.com's GPT-6 Astra page as a reference for quality (a dark, starry, cinematic page that scrolls into calm reading), and then asked for something that could not be mistaken for a copy of it. The answer is Kodi's own world: Kodi, the little forest spirit who lives on the tablet, is drawn in thousands of points of light, and he stands in a living forest at dusk made of the same light. Everything else on the site follows from that one idea.

Three things the user said that decide everything else:

- "Premium, easy to use, modern, and a 3D look."
- "The forest doesn't feel lively like Remi." The forest must be made of the same living light as Kodi, and it must move: wind, falling leaves, fireflies, animals.
- "It looks like everything is put randomly." Every page sits on one 12-column grid with the same edges, even spacing, and numbered sections.

## Goals

- A first screen that makes people stop: Kodi forming out of streams of light between the two halves of the name, then standing alone in his forest and playing.
- A page people recognise as Remi's, not OpenAI's.
- A family portal a daughter can read in thirty seconds at lunchtime, that still feels like the same world.
- Tablet screens that keep every accessibility property they have now (big type, big targets, high contrast, nothing conveyed by colour alone) while sharing the forest's colours and Kodi.
- Everything runs on an ordinary laptop and phone without stutter.

## Non-goals

- Changing what the tablet does, how Remi talks, or any server behaviour. This is the look and the layout only.
- A film. The landing page has a film frame; until a scene is shot it holds the painted placeholder from the prototype.
- Redesigning the family portal's data. The portal shows what it shows today (evening note, conversations, alerts, people, routine, guidance, tablet, profile), arranged and styled differently.
- Running the heavy particle forest on the elderly person's tablet. The tablet keeps its existing Kodi scene.

## Anti-goals (what would make this a failure even if it works)

- Anyone who has seen the OpenAI page saying "that's a copy."
- A page that reads as a template: centred hero, three feature cards, centred CTA.
- Dead decoration: a forest that sits still, or motion that runs for its own sake. Everything that moves is alive (wind, creatures, Kodi) or answers the person (cursor, typing, scroll).
- The tablet getting harder for Avni to read or tap.
- A phone that heats up or a laptop fan that spins up on the landing page.

## Constraints

- Next.js 16 App Router (read `node_modules/next/dist/docs` before writing code), Tailwind, the existing token system in `src/app/globals.css`, three.js 0.160 (already a dependency; the tablet's `KodiScene` uses it).
- The tablet's existing Kodi scene (`src/app/patient/[token]/kodi/`, shape in `src/lib/kodi-shape.ts`) stays as the tablet's character: same code, same behaviour. The website's Kodi is a new scene built from the prototype, and the website's is the canonical look. So the tablet's Kodi is retuned to match it, and no more than that: its day palette moves from lavender to the forest's moon-white skin with mint leaves, gold sparks and a warm chest glow (`PAL` in `kodi-shape.ts`), its head-to-body ratio is nudged to the prototype's (about 1.7, from 1.5), and its night palette stays. Section 04 shows them side by side, so they must read as one creature.
- `prefers-reduced-motion` must be respected everywhere: no autonomous motion, no scroll-driven scattering, Kodi shown still.
- The site must work with WebGL unavailable: a still image of Kodi in the forest and the same layout.
- No new fonts beyond Geist (display and body, weights 300 to 600) and Caveat (only for the hand-written touches: Kodi's speech bubble, "Dear Priya," and the signature on the letter, the name under the tablet's photo card). Plus Jakarta Sans and Atkinson Hyperlegible stay on the tablet.

## The world

### Palette

Dusk, from the prototype's tokens:

- Sky: `#070B22` at the top through `#0D1638` and `#13213F` to a forest floor `#0A1A1C`.
- Ink `#F5F3EE`, dim text `#AEB4C8`.
- Gold `#FFCF7A` to `#F2A93B`: the only button colour, the fireflies, lanterns, the wax seal. Buttons are a vertical gold gradient with a soft gold glow and a 1px inner highlight.
- Mint `#A8F0C6`: Kodi's leaves, the brand mark, the "listening" states.
- Glass panels: white at 4 to 7% over the scene, 1px white border at 12 to 14%, backdrop blur 10 to 16px.

Day (the portal in daytime, and the tablet):

- Page: `#F4F7FB` to `#E6F1EB`. Ink `#16203B`, dim `#5A6580`, lines `#16203B17`.
- Accent green `#2F7A5E` on `#DDF1E6`. Gold as above. Cards are white with a very soft shadow.

### Type

Geist. Headings weight 500, tight tracking (-0.035em to -0.05em as size grows), line-height 1.0 to 1.05. Body 400 at 16 to 19px, line-height 1.6. No all-caps labels anywhere. The small gold section numbers (01 to 05) are 13px weight 500.

### The grid

One grid for every page: 12 columns, column gap `clamp(16px, 2vw, 28px)`, max width 1240px, side padding 24px, so the left and right edges are the same on every section and every page. Section spacing is one token, `clamp(96px, 16vh, 180px)`. On screens under 900px everything stacks to one column.

### Kodi, in light

About 15,000 points. His skin is a crisp shell (points sit on the surface, a few inside for glow), moon-white with a few gold and mint sparks. The silhouette glows: points whose normal faces sideways are brighter and larger (rim light), points on the far side are dimmer, so the shape and the face read from across the room. Two glowing cream eyes with a bright glint, pink cheeks, a small warm smile, two leaves with a bright edge and a vein, a little stem. A warm lantern-light sits in his chest. Point sizes are mixed: a few large bright ones, some medium, mostly fine dust; each point twinkles at its own pace.

He is alive on his own:

- Breathes and sways gently; turns a little.
- Blinks every 2.5 to 5 s.
- Every few seconds does something: waves hello (first, always), a hop, a double hop, a twirl, looks around.
- Plays with a firefly friend that circles him; now and then it swoops close and he hops after it, following it with his eyes.
- Turns to look at the cursor; points near the cursor lean towards it and shine brighter.
- Turns to watch the rabbit when it crosses (below).

### The forest

Made of the same points as Kodi, about 190,000 to 230,000 of them, one draw call:

- Trees: round leafy trees (overlapping crowns on a trunk that flares into roots) and pines (stacked tiers), leaves graded from deep teal low down to bright mint at the crown, with gold glints, some with pink, gold or blue blossom. Trunks are warm cream. They sway in the wind, the crowns more than the trunks. Six near the clearing's edges, six in the deep woods behind, placed with a fixed seed so the forest is the same on every visit.
- Grass: tens of thousands of short glowing blades, thickest near the viewer, rippling in the wind.
- Falling leaves let go of the crowns and drift down, fading as they land.
- Fireflies, hundreds, wander through the woods and blink on and off.
- Glowing mushrooms (blue, pink, gold) that breathe, and small flowers in the grass.
- A rabbit hops across behind Kodi every 16 s, stops halfway to nibble, hops on.
- A flock of three birds crosses the sky every 19 s.
- The wind comes in gusts.
- A faint far tree line stays a soft blurred silhouette for depth; a moon; stars above the trees.

The forest fades in during the opening (0.6 to 3 s) and dims to about 40% behind text as you scroll.

### Day and night

The forest follows the clock. The landing page and sign-in are always night. The family portal is day until 19:00 local time, then night. The tablet already decides day or night from the household's time zone (`isNightTheme`) and keeps doing so.

## Landing page

Sections in order, each on the grid. The whole page is `landing-and-signin.html`.

### The opening (sticky, 230vh of scroll)

The sequence the user specified, in this order and nothing else:

1. 0.15 to 1.55 s: "Remi" slides in from the left edge, "companion" (lighter weight, pale gold) from the right edge, and settle on one line low on the screen (top 76%), at the grid's left and right edges.
2. 0.3 to 3.3 s: two streams of light fly in from the left and right edges, each point on its own small curve, and come together as Kodi in the centre, standing on the grass. The forest grows in around him.
3. 3.6 to 4.6 s: the two words fade. Kodi stands alone. Under his feet a title plate stays: a 1px line edge to edge, "A friend for people living with dementia, and the families who love them." on the left and "Scroll to meet Remi" with a small gold dash on the right.
4. From 4 s Kodi is "alone" and starts his play, the cursor response, the wave.
5. On scroll, Kodi breaks apart into the starfield (each point to its own far point, in a loose order), the plate fades, and the headline fades in: "A gentle friend for the one you love" in columns 1 to 7, with three facts in columns 9 to 12 as a list with hairlines: "Under a second" (to answer, like a real conversation), "37 languages" (in a soft, natural voice), "Every evening" (a short, honest note for the family).

Navigation is a floating glass dock, centred at the top: brand mark and name, three links that scroll to sections (How it works to 02, For families to 04, Safety to the safety paragraph in the footer), "Sign in", and the gold button. Until the hackathon is judged (29 October 2026) the gold button reads "Try the demo" and opens a small glass chooser under the dock with two choices, "Avni's tablet" and "The family portal", which open the demo household exactly as today's landing buttons do (the device token link and the startDemo action). After that date the button reads "Get started" and opens the sign-in card in create mode; the switch is one constant. "Get started" always lives in the section 05 panel. No link points at a page that does not exist: there are no Care homes, Privacy, Research, About or Press pages in this design, and the footer lists only what exists (see 05).

### 01 An evening with Avni

Film frame in columns 5 to 12 (16:10, 28px radius, running time badge, gold play button). Words in columns 1 to 4: the section number, "An evening with Avni", two lines about her, and a pulled quote with a gold left rule: "It never minds when I ask the same thing twice." with the cite "Avni, in the film (scene to be shot)".

### 02 How it works

The number, then a big statement in columns 1 to 8 ("Remi lives on a tablet in their home. It listens all day, answers like an old friend, and never tires of the same question."), a short note in 9 to 12, then three glass step cards across the full width, each with a ringed gold number: The family sets it up; Remi keeps them company; The family hears how it went.

### 03 Talks like a friend, not a machine (sticky, 170vh)

Words in columns 1 to 5 with four pill tags (Interrupt any time, Tells stories, 37 languages, Knows when to stay quiet). Kodi's scattered points gather into a heart on the right of the screen (centred around column 9) as this section is centred in the viewport, and drift apart again as it leaves.

### 04 One friend, two places

Heading in columns 1 to 7, its one-line note in 9 to 12. Below, the tablet (66% wide, turned 8° towards the centre) and the family's phone (320px, turned -12°, overlapping the tablet's right edge, in front). Both show real screens from the product (the tablet's home, the portal's Today) once they exist; the prototype's painted screens stand in until then.

### 05 Bring Remi home, and the footer

A glass panel: number, "Bring Remi home", "Set up takes about ten minutes. No new devices needed." on the left, the gold button on the right. Then a footer on the grid: about (columns 1 to 4); from column 7, "Product" (How it works, For families, Sign in) and "Safety" as a short paragraph rather than links (what Remi never does: no medical advice, never pretends to be family, tells the family when something is wrong, conversations visible only to invited family), with "Contact" as a mailto link; and the line "Remi is not a medical device and does not give medical advice." plus the hackathon credit ("Built for the Nebius x NVIDIA hackathon, on NVIDIA Nemotron") in the same small print.

### Phones

Under 900px the dock drops its links, Kodi is drawn at 0.6 scale, the two opening words are smaller, all sections stack, and the devices in 04 stack too. The particle budget drops (see Performance).

## Sign-in and creating an account

`landing-and-signin.html?mode=signin`. The same night forest, no page content. Kodi stands to the right of centre (x = 2.2 in scene units; centred on phones). A glass card at the grid's left edge, vertically centred: brand, "Welcome back", "Sign in to see how Avni's day is going." (the person's own name once known), Email, Password, gold "Sign in", "New here? Set up Remi for your family", and under a hairline, "Only family you invite can see conversations. Remi never shares them with anyone else." A left-to-right shade keeps the card legible over the forest.

Kodi reacts to the form, eased by time so it feels the same on a slow tablet and a fast laptop:

- Email field focused or typed in: within about 0.4 s he turns towards the card (yaw about -0.75 rad, scaled a little by how much has been typed) and leans in slightly. If nothing is typed for 4 s he drifts back to idle.
- Password field focused: he turns to face the viewer and both leaves fold down over his eyes, glowing a little brighter; a hand-written bubble "I'm not looking!" appears near him. Everything returns when the field loses focus.
- Sign-in errors are shown in the card as today; Kodi does not react to them.

The card has two modes, as the login page does today: "Sign in" and "Create your family account" (email, password, the gold button reads "Create account"), switched by the link at the bottom ("New here? Set up Remi for your family" / "Already with us? Sign in"). "Get started" in the dock and "Set up for your family" in section 05 open the card in create mode. Kodi reacts the same way in both modes. After creating the account the person continues to `/family/setup` as today; that page uses the same forest and card, the card holding the setup form.

## Family portal

Six pages as today: Today, People, Routine, Hard questions, Tablet, Profile. They share:

- The floating glass dock (brand, the six page names with the current one highlighted in green, the person's initial in a green circle).
- The day or night tokens by the clock.
- The grid.

### Today: her day as a walk through the forest

At the top, a rounded panel (380px tall, 28px radius) with the forest and a sandy path winding gently uphill from 8 am on the left to 8 pm on the right, hour marks along the bottom. The part of the path already walked glows warm. Along it:

- Routine moments are lanterns on posts, labelled underneath. Lit (gold, with a glow) once done; unlit until then. The next one is marked "next".
- Conversations are fireflies hovering above the path with a dotted thread down to it, labelled above (labels alternate between two heights so neighbours never overlap). Hovering or tapping one shows a card: time, mood, the gist.
- Kodi stands on the path at the current time (drawn with the tablet's still Kodi; in the real build he is the small animated scene from the tablet, a 2D fallback on low-power devices).
- "Now", the lit lanterns and the day-or-night theme all follow the household's clock (`households.timezone`, as the evening note and the tablet already do), rendered on the server so there is no flash and a daughter in London sees her mother's day in her mother's time. The header's time says which zone it is when it differs from the viewer's ("1:05 pm in Jaipur").
- Top left: the date and time, "Avni's day so far" (after 19:00: "Avni's day, all of it"), and the day's mood as weather: a sun pill "Sunny mood so far", a moon pill at night "A calm, happy day", clouds for a hard day.
- Top right: a small legend (Routine done, A conversation, Still to come).

On a phone (under 700px) the panel keeps its height but shows a window of about six hours around "now", scrollable sideways with "now" centred and a soft fade at both edges; the firefly labels are hidden and a tap opens the card instead; hour marks every two hours. The dock collapses to the brand, the current page name and a menu button.

The forest in this panel is the day forest (sage, mint, warm sun) by day and the dusk forest at night. The prototype draws it as a layered illustration with trees in two rows and hills; the build may use the same illustration (it is light and reads well) and should add gentle life to it: swaying crowns and a few drifting fireflies, nothing heavier. The full particle forest is not used here.

Below the panel, on the grid:

- Columns 1 to 7: the evening note as a letter from Remi. Lined paper (cream by day, deep navy at night), "Last night's note" or "Tonight's note" with when it was written, "Dear Priya," in Caveat, the note in 18px on the lines, the leaf mark and "Remi" in Caveat as a signature, and a round gold wax seal with the leaf at the bottom right. When there is no note yet for today the letter shows last night's, and the existing "write tonight's note now" action sits under it as a quiet text button ("Write tonight's note now"); it stays exactly the action it is today.
- Under the letter, "What she talked about": today's conversations as a list, each row with the time, her words, Remi's reply, the mood pill, and the "your guidance used" badge when it applies. The firefly card on the path shows the same conversation: time, mood, her words and Remi's reply in full. There is no separate "gist" and nothing new is generated; the path summarises the list, so both come from the same data.
- Alerts: the strip shows today's state. Below it, "Earlier alerts" lists the alerts the page shows today (reason, detail, time), collapsed by default when there are none today.
- Columns 8 to 12, stacked: "Her week, as weather", seven small tiles (Wed to Today) each with a sun, sun-and-cloud, or cloud for how she seemed, today highlighted in green; "Today in numbers", two firefly jars (chats, with that many lit fireflies up to a dozen; routine done, lit fireflies out of the total), and the alert strip ("No alerts today, all calm" in green, or the alert in the alert colour with its time and what Remi did).

### People, Routine, Hard questions, Tablet, Profile

Same dock, same grid, same card and token styles as Today. Content and forms stay as they are. Each page's header is a shallow strip of the same forest illustration (120px) with the page title, so the world is present without competing with the forms. People cards show the person's photo (or initials) on a soft green disc; routine items in a list with the lantern icon lit when done today; guidance entries as cards with the topic as a heading. These three are the builder's call within the system; the builder must keep every existing field and action.

## Tablet

The tablet keeps its screens, its existing Kodi scene, its type sizes (never below 20px), its large targets, and its day and night rule. It adopts the forest colours: day pages `#F2F6FB` to `#E3F0E8` with ink `#16203B`, accent green `#2F7A5E`, gold for "now"; at night the existing night tokens stay.

- Home: unchanged except for colours.
- My day: a path of stepping stones winding down the screen, one stone per item, time and label beside each in 22px. The four states the screen has today all stay: done (pale green stone with a tick), due (gold stone with a glow, the word "now", and Kodi sitting beside it), missed (white stone with a red exclamation mark and the word "missed" in the alert colour), upcoming (white stone with an outline). Due and missed items keep today's large "Done" button, to the right of the label on the same row, so the reminder flow is unchanged. Nothing relies on colour alone.
- Who is this?: the camera as today. The answer is a tilted photo card (a white frame, the photo, the name in Caveat at 46px, the relation and one fact underneath, e.g. "your grandson · he visited on Sunday"), with Kodi peeking over its top corner. The spoken answer is unchanged.
- Kodi on these inner screens is the still drawing (`KodiStill` in `kodi.tsx`, retuned to the same look as the scene). The animated scene stays mounted only on Home; no second scene instance runs on the tablet.
- Talk: unchanged except for colours.

## Performance

- Landing page budget: about 250,000 points on desktop. The point count is the budget, not the draw-call count; the prototype draws the forest, Kodi, the stars, the rabbit, the birds and two sprites separately, and the builder merges what is easy to merge. On phones and on any device reporting fewer than 8 logical cores or `navigator.deviceMemory < 4`, use the low tier: about 70,000 points (fewer trees, less grass, 120 fireflies), pixel ratio capped at 1.5. Target 60 fps on a 2020 laptop, 30 fps on a mid-range phone.
- The scene pauses when the tab is hidden and when the canvas is scrolled fully out of view (below section 03 it is only needed for the heart; after 04 it stops).
- The whole scene is loaded with a dynamic import after the page's text has painted; until then the still image of Kodi in the forest is shown at the same place so nothing jumps.
- `prefers-reduced-motion`: the still image, the words simply fade in, no scattering.
- The portal never loads the particle scene. Its header illustration is SVG.
- Fonts: Geist and Caveat via `next/font`, with `display: swap`.

## Accessibility

- Every page passes 4.5:1 for body text and 3:1 for large text in both themes; the prototype's dim text on the night sky is at the limit and the builder should check it, raising it to `#B8BDD0` if needed.
- The canvas is `aria-hidden`; the opening words and headline are real text in the DOM from the start (only their opacity animates), so screen readers get the page immediately.
- Focus rings: 2px gold outside the element, visible on the dark and light themes.
- Keyboard: the dock, every card action and every form field in tab order; the path's lanterns and fireflies are buttons with labels like "9:40, her roses, happy".
- Tablet: unchanged rules; the stepping stones are a list in the DOM.

## What is decided, and by whom

Decided by the user: the demo reachable from the dock ("Try the demo") until judging; the opening sequence and its order; Kodi in particles; the living forest (trees that sway, leaves, fireflies, animals); one grid and numbered sections so nothing looks random; Geist; the playful ideas for the other pages (Kodi reacting to the form, the day as a walk, the letter, the stepping stones, the photo card).

Decided by me, to be checked by the user while reading: the dusk palette and gold as the only button colour; the forest following the clock, with night for the landing page and sign-in and the household's clock for the portal; the day-time portal; the three facts beside the headline and the section copy; the devices overlapping in 04; the dock and footer linking only to what exists; the sign-in card carrying account creation as a second mode; the portal on a phone as a scrolling six-hour window; the conversation card showing her words and Remi's reply in full rather than a generated gist; keeping the note-now action and the earlier-alerts list; the tablet's four reminder states and Done button on the stepping stones; a still Kodi on the inner tablet screens; the web Kodi as the canonical look, with the tablet's palette and proportions retuned to it; the particle budgets and the low tier; the portal's forest as a light illustration rather than particles.

## Left to the builder

- Exact point counts and shader constants: start from the prototype and tune to the budgets.
- The fixed seed for tree placement.
- How the sign-in card and the forest share one page in Next (a client component for the scene, the form as today).
- The People, Routine, Hard questions, Tablet and Profile page layouts within the system.
- The still fallback image (render it from the prototype at 2x).
- Which existing Tailwind tokens map to the new ones; add new tokens, do not restyle the tablet's existing classes by hand.

## Open

- The product name and domain. "Remi" everywhere until then, from one constant.
- The film. Placeholder until shot.
- Real screens for section 04, once the portal is built.
