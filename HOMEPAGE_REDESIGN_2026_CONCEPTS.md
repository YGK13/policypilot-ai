# AI HR Pilot — Homepage Redesign, Five Concepts (July 2026)

**Author:** senior design review for the founder
**Product:** aihrpilot.com — compliance intelligence platform for enterprise HR
**Buyers:** COO / PE operator (primary), Head of HR with CFO approval (secondary)
**Value stack:** operational efficiency first, compliance protection equally load-bearing
**Prior attempt:** "The Protocol" (cream + forest green + brass, roman serif) — user verdict: big improvement over the dark-blue-gradient legacy site, but "too khaki"
**This document:** text-only, on purpose. Five distinct philosophies, each end-to-end. We pick one and code the preview afterward.

---

## Table of contents

1. Where the market actually is in July 2026 (research)
2. What "AI HR Pilot" is fighting against (anti-patterns)
3. The five concepts
   - Concept A: **Signal** — restrained operator monochrome
   - Concept B: **Field** — generative AI-native, ambient WebGL
   - Concept C: **Ledger** — institutional authority (the anti-khaki Protocol)
   - Concept D: **Console** — operator-native dense-data, product-as-hero
   - Concept E: **Atrium** — documentary realism, human stakes (wildcard)
4. Head-to-head comparison table
5. Recommended top 2 and why
6. Honest read on the "too khaki" concern

---

## 1. Where the market actually is in July 2026

I looked at the current-state homepages of the buyer's reference set. Grouped by aesthetic era, not category.

### The HR incumbents (Workday, ADP, BambooHR)
Still 2020. Center-aligned hero, stock photography of "diverse workforce," blue-and-white palette, product screenshot below the fold, tour-of-features. Workday leans corporate-navy, ADP leans healthcare-teal, BambooHR leans SMB-friendly-cartoon. None of them read as AI-native. They look like software you buy because your legal team said yes, not because your operators said "get me that."

### The modern HR tier (Rippling, HiBob, Deel, Lattice, 15Five, Culture Amp, Ashby)
This is where AI HR Pilot's buyer actually shops for reference. Interesting split:

- **Rippling** is the most confident of the group. The homepage now leads with a single unified-platform statement, vertical role-based tabs (Founder / Operator / IT / HR / Finance) that let a COO navigate to their view without leaving the fold. Hero shows product surfaces, not stock photos. Palette has widened from the old blue-and-white to a fuller family, and the AI product line has its own micro-site with a distinct treatment. Reads 2025-2026, not 2020.
- **HiBob** just rebranded (new mark, new type system). Warmer, more editorial. Illustrations do more work than photography. It reads friendly, mid-market, HR-first — which is exactly the audience it is not trying to lose. It does not read "operator tool."
- **Deel** is loud, dense, screenshot-heavy, aggressively conversion-optimized. It works because Deel is a growth machine, but the site reads more "growth marketing" than "premium enterprise."
- **Lattice / 15Five / Culture Amp** are all clean, calm, product-forward. Lattice in particular has moved to a "consumer-grade" register — screenshots dominate, marketing copy is trimmed. But all three still read as "employee experience" tools, not operator tools. That's a positioning tell as much as a design one.
- **Ashby** is the design-forward one in the recruiting corner. Restrained, monochrome-adjacent, product-as-proof. Ashby is the closest to what "premium AI-inside HR tool" should look like in this category.

### The AI-native enterprise tier (Harvey, Glean, Notion AI, Cursor, Perplexity Enterprise)
This is where the aesthetic bar actually is.

- **Harvey AI** did a full brand rebuild in early 2026. Off-white surfaces, editorial serif headline ("An intelligent legal coworker"), single black CTA, a dark-framed product UI mockup anchoring the lower fold, persistent "Ask Harvey" assistant button. Their public design system post talks about locked warm-neutral hues, dark-mode chroma tuning, and cross-surface consistency (web / mobile / Office add-in). Harvey is what happens when a category is served by 40-year-old vendors and one new entrant decides to look like a private bank instead. This is the closest analog to the AI HR Pilot situation.
- **Glean** leads with the enterprise-coworker frame ("gives every employee an AI Assistant and an Agent"). Product-forward, calm, corporate-serious without being boring. Screenshots of agents doing real work in the first five seconds of the page.
- **Cursor** is the most stripped-down. One sentence of positioning, one download button, product demo. No marketing anywhere. Reads as confidence.
- **Notion AI** has stayed with warm off-white surfaces, near-black text, restrained blue accents, oversized editorial headlines. Very calm hierarchy. Refuses the dark-mode-neon default entirely.
- **Perplexity Enterprise** is dark, technical, monospace-inflected, product-forward.

Pattern across the AI-native tier: they either commit hard to **editorial calm on off-white with serif headlines** (Harvey, Notion) or **dark technical monospace-inflected minimalism** (Perplexity, Cursor, Linear). Nobody in this tier is doing centered generic hero + emoji feature cards. Nobody.

### The premium SaaS aesthetic ceiling (Stripe, Linear, Vercel, Ramp, Mercury, Retool, Modal)
This is the reference set the founder is unconsciously benchmarking against.

- **Stripe** is the WebGL gradient-mesh reference. Cream / sherbet / lavender / indigo / ruby washed across the upper fold via a custom minigl canvas. Core palette is disciplined monochrome (near-navy #061b31 on white) with #533afd purple as decisive brand accent. Sohne variable font at lighter weights (300/400) for airy display type. Deep navy ink (never pure black) does body work.
- **Linear** is dark-first monochrome plus one purple accent, precision typography, product-forward hero, very tight motion.
- **Vercel** is monochrome (#171717 / white / grays), Geist and Geist Mono dual system, subtle grid pattern behind content, 6px radii, engineering-precise. Blueprint-grid aesthetic.
- **Ramp** uses a saturated palette (yellow, deep blue) that would normally read as garish, tamed by disciplined whitespace and a formalized bento-grid pattern with consistent gutters and size-as-hierarchy rules.
- **Mercury** is dark with lime accent — premium minimalist for founders.
- **Retool** is engineer-serious, monospace, dense.

Two dominant aesthetics have won 2026 SaaS: **techno-futurist** (dark + neon + shaders + bento) and **editorial-calm** (cream + serif + whitespace + restrained accent). Everyone I looked at has picked one and committed. The sites that lose are the ones stuck between them, or the ones that added AI-generated slop shaders without a system underneath.

### Bleeding-edge 2026 patterns that read premium
- Live product surfaces as the hero, not screenshots (Cursor, Ashby, Linear).
- WebGL/paper-shader gradient meshes done well (Stripe minigl, Notion-era shader gradients). Read as premium when they're subtle, restrained to one region of the page, and calibrated color-wise. Read as slop when they're autoplay maximalist.
- Editorial serif display type on off-white (Harvey, Notion, Anthropic marketing).
- Dual-font systems: display serif or neo-grotesque + monospace for numerics/metadata (Vercel, Linear, Perplexity).
- Vertical role-based navigation tabs in the hero (Rippling).
- Scroll-linked product-panel reveals with cinematic slow motion (not fireworks).
- Dark-mode chroma-tuned neutrals (Harvey's design system post is a masterclass).

### Bleeding-edge patterns that already read tired
- Grainy off-white with cursive one-word logo (peaked 2024).
- Bento grid without earned hierarchy (Ramp did it right; everyone else copying looks like a template).
- Autoplay looping product video with dark overlay and floating logos (peaked 2023).
- Isometric 3D illustration of a "person using our app" (still on ADP and half the HR incumbents; this is a tell).
- Emoji as feature icons on a B2B enterprise site (the current AI HR Pilot site does this; it reads as consumer / early-stage / "we didn't hire a designer").
- Generic dark blue gradient hero with a centered card and two CTAs (also current AI HR Pilot; this is the default Vercel-template look and it whispers "I'm five people and one Notion doc").

---

## 2. What AI HR Pilot is fighting against — the "poor man's AI HR" tell

The founder's exact phrase: "looks like poor-man's HR tech that happens to have AI in the engine." Here's what triggers that read, ranked:

1. **Emoji as UI**. On a B2B enterprise page, emoji icons broadcast "we shipped fast, we didn't invest in design." COOs and PE operators read this in one second.
2. **Centered generic hero**. Two lines of copy, primary + secondary CTA, dark gradient background. This is the default Next.js starter template. It says "we're a 2023 SaaS."
3. **Product screenshot in a floating browser chrome**. The Mac-window-with-shadow around a dashboard PNG has become the universal "I don't have real motion / real product to show" tell.
4. **Generic AI-blue-gradient**. #4F46E5 to #7C3AED, from top-left to bottom-right. Every AI startup used this in 2023-2024. It now reads as "I picked this because it looked like ChatGPT."
5. **Stock photography of diverse office workers laughing at a laptop**. Instant "I'm HR tech from 2015."
6. **Feature grid of 6 cards, each with an emoji or generic icon, centered short blurb, no product proof**. The universal "we don't know what our product does yet" section.
7. **Testimonial carousel with 3 quotes and 3 blurred logos**. Reads as "we have three customers and one wants their logo removed."
8. **"AI-powered" as a value prop instead of a mechanism**. Category-leading AI products in 2026 either don't say "AI" at all (Cursor, Linear) or they say it once and then show the AI doing the work. AI HR Pilot needs to earn the "AI-native" read through what the page does, not what it says.
9. **Serif in the wrong register**. The Protocol direction went editorial-serif, which is correct for authority, but paired it with khaki/forest, which is the register of a hedge-fund pitch deck or an Ivy-League endowment report — not an operator tool that clears real work off a COO's desk today. Feels older than the buyer.
10. **Dark navy blue as the primary brand color**. The color of every 2018 B2B site. Trust color; boring color. Everyone's using it. Fine as a support hue; wrong as brand.

Whatever we ship next needs to violate at least seven of these ten. All five concepts below do.

---

## 3. The Five Concepts

Each concept is a complete philosophy, not a variation. Different logo, different palette, different type, different hero pattern, different motion, different product-UI hint. Read them as five different companies AI HR Pilot could plausibly be.

---

### Concept A — SIGNAL

**Philosophy:** the tool a COO uses because it reads intent and returns the shortest correct answer. Design gets out of the way. Restraint is the brand.

**Comparable brand:** Linear. Cursor. Perplexity Enterprise. Ashby. Ramp's dashboard side (not their marketing side).

**Who this appeals to:** COO / PE operator, hard. HR head second. This concept reads "I already ship" — it does not try to seduce the buyer, it recognizes them.

**Positioning line (hero H1):**
> "Compliance intelligence for operators who ship."
Sub: "AI HR Pilot reads your policies, watches your workforce, and closes the risk before HR is on the phone."

Notice: no "AI-powered." The AI is implied by "reads" and "watches."

**Logo direction:**
Wordmark-only. Custom-drawn lowercase "pilot" in a modified neo-grotesque (Söhne Halbfett or Inter Display SemiBold, tightened -3% tracking, with a single custom ligature on the "il" that reads as a subtle signal line — one horizontal line under the two verticals). No icon. No emoji. The "AI HR" scaffolding around the word is set two type-sizes smaller, in mono, above the wordmark. When it appears small (favicon, avatar), it collapses to a single glyph: the "p" with the signal-line underscore, monospaced, in the brand accent.

Avatar: black roundel, white "p" with signal underscore. That's the whole system.

**Full palette:**
- Ink #0A0B0D (near-black, warm-cool balanced; use for all text and dark surfaces; never #000)
- Paper #F7F7F5 (warm off-white; primary background in light mode; borrows a hair of warmth from Notion's neutral, not enough to read cream)
- Signal #C6FF3D (electric lime; the ONLY accent; used for the wordmark ligature, one hero word, one primary CTA state, live-status dots)
- Steel #E8E8E5 (subtle divider / card / secondary surface)
- Graphite #4A4B4E (secondary text)
- Fog #8B8C8F (metadata, timestamps, mono numerics)
- (Dark-mode variant: Ink becomes Paper, Paper becomes #0A0B0D, Steel becomes #17181A, everything else compresses. Signal stays #C6FF3D but is desaturated by 8% in dark mode to prevent bloom.)

**Typography pairing:**
- Display: **Söhne** at Buch (400) and Halbfett (500), tracked -1.4% at 56/64/72px hero sizes.
- UI: **Söhne** at Buch (400) for body, Kräftig (500) for emphasis, 15/16px.
- Mono: **Söhne Mono** for numerics, timestamps, code, log lines, compliance IDs.
- (License-conscious fallback: **Inter Display + Inter + JetBrains Mono**. Free-tier alternate: **Geist + Geist Mono**, which is what Vercel uses and would keep us in the same visual family.)

**Hero pattern (above-the-fold layout, precise):**
- Left column, ~55% width. Vertical stack. Small mono eyebrow ("v3.4 — shipped July 2026"). H1 hero copy, 56px, three lines. Sub-copy, 18px, two lines. Two CTAs side-by-side: primary (Signal-lime pill, Ink text, "Book operator review") and secondary (Ink underline text, "See it read a real policy →").
- Right column, ~45% width. **Live product surface**, not a screenshot. Actual functioning mini-instance of the compliance-triage feed: rows of workforce events, each with a compliance state indicator (Signal-lime dot for cleared, Fog for pending, one amber for a real triaged issue). Every 4 seconds, a new row streams in from the top, an old one fades from the bottom. One row is currently mid-analysis, with a mono-font AI reasoning log unfurling underneath ("Cross-referencing NY §201-d… policy match: employee handbook v2.1 §4… risk level: none"). This is the "signature moment" (see below).
- Above the fold: nothing else. No trust logos, no feature grid. Whitespace does the work.

**Signature motion / interaction:**
The right-column feed is real and public. It's the demo speaking for the product without a demo request. Rows have three motion states: **ingest** (row slides in from the top with a 200ms Signal-lime border pulse), **process** (mono text unfurls character-by-character at ~40cps, indistinguishable from a real AI stream), **resolve** (row settles, Signal-lime dot, silent). One row per session goes into a **triage** state that gets a subtle amber flash and then hands off to a "Yuri (Head of HR) notified" pill. Nothing in this loop is decorative — every element is a real product surface at 1:1 fidelity.

If we want to lean bleeding-edge: the feed is behind a very subtle glass surface, using a paper-shader radial gradient that only appears when the user's cursor is within 200px of the panel. Dead calm at rest, comes to life when read.

**Product-UI hint (how the aesthetic carries into the app):**
Dashboard is a three-pane operator view: left rail (workspaces), center feed (events + AI reasoning), right context pane (current policy, current person, current risk). All Ink on Paper, mono for anything with a number, Signal-lime only for status and for the current-focus indicator. Zero decorative color. Chat / Ask-Pilot lives in the right pane, not as a floating modal. Settings look like a Linear settings page — dense but calm, one column, hairline dividers.

**Integrations story visual:**
NOT a logo cloud. A single horizontally-scrolling **event ledger** across the width of the section: every logo (Slack, Teams, BambooHR, Workday, Google Workspace, Okta, ADP, Rippling) is a mono row with a live-looking "last event ingested" timestamp. The section headline: "Reads from the systems you already run. Writes nothing until you approve." The design says integration is a plumbing concern that already works — no bragging.

**Real risks:**
- Reads as Linear-derivative if we don't earn the AI-reasoning feed. If the live feed is fake (just a CSS animation), it becomes worse than a screenshot. Non-negotiable engineering commitment.
- Buyer says "too developer-tool." COOs are not developers. Mitigation: the live feed's language is **HR-operator English**, not JSON or code. "Cross-referencing NY §201-d" not `{regulation: "NYCRR-201d"}`.
- Signal-lime is the same accent lane Mercury owns. We're not in Mercury's category so I think it's fine, but if it reads too banking-fintech, alternates: warm coral #FF6A3D, electric teal #26E5C4, or a graphite-with-orange (Retool-adjacent). Lime is the sharpest against warm-neutral paper.

---

### Concept B — FIELD

**Philosophy:** the AI is a force running underneath your workforce. You feel it before you see the product. The site itself is the demonstration of "AI-native" — motion, ambience, and light do the talking. Wow without noise.

**Comparable brand:** Stripe (gradient mesh), late-2025 Anthropic marketing, Openart-era Runway, Notion (calm hierarchy). Restrained cousin of Vercel's shader-heavy sub-brand pages.

**Who this appeals to:** COO who wants to feel like they picked the future; HR head who wants to bring something to the CFO that looks obviously ahead. Slightly stronger on the HR side than Signal is. Weakest for old-school PE operators who read motion as noise — offset that with restraint.

**Positioning line:**
> "Your policies, in motion."
Sub: "AI HR Pilot turns your handbook, your workforce data, and every state's compliance rules into one live operating field. See risk the moment it moves."

**Logo direction:**
Abstract mark + wordmark. The mark is a single **field glyph**: a soft rounded square (12px radius at 32×32) filled with a live gradient mesh. Static outside the site; animated only when the user is on the /product or /demo pages. Wordmark is a warmer humanist sans (Söhne Breit or GT Alpina Sans) — softer than Concept A's neo-grotesque. In dark mode the mark inverts to a knocked-out glyph over a dimmer mesh.

Avatar: the field mark alone, animated in Slack, static everywhere else.

**Full palette:**
- Ink #101018 (indigo-black — reads sophisticated, not corporate-navy)
- Paper #FDFCF9 (very warm off-white, one step warmer than Concept A's, but not cream — Notion-adjacent)
- Field mesh (used only in shaders and gradient art):
  - Aurora #B9C6FF (soft cool)
  - Bloom #FFB3A0 (soft warm coral)
  - Iris #7C6BFF (electric violet, only for the interior of the mesh; never in UI)
  - Signal-green #9BE8B3 (used sparingly as a live-status indicator)
- Steel #E3E1DC (dividers, subtle surfaces)
- Graphite #3A3B44 (secondary text)
- (Dark mode: Ink becomes #0A0A11, Paper becomes #16161F, mesh stays but drops saturation 20%. All UI actions get a soft Iris underline when active.)

Rule: the vivid mesh colors NEVER appear on buttons, text, or borders. They only live inside shader surfaces and inside the logo. Everything the user clicks or reads is Ink-on-Paper. This is what separates this direction from AI slop.

**Typography pairing:**
- Display: **GT Alpina** (contrast serif, medium weight) at 64/72/88px for hero. Optical size matters — use display cut, not text cut.
- UI: **Söhne** Buch/Kräftig 15/16.
- Mono: **JetBrains Mono** for numerics and log lines.
- (Free alternates: **Fraunces** for display + **Inter** for UI + **JetBrains Mono**.)

The serif choice is deliberate: it prevents Field from reading as generic-AI-startup. Stripe uses sans everywhere; Anthropic uses serif for their marketing brand voice. AI HR Pilot in this direction should read Anthropic-adjacent — considered, warmer, human-toned — not Runway-adjacent.

**Hero pattern:**
- Full-bleed gradient mesh occupies the top 65% of the fold, but softly. It is generated at page load with a seed based on the visitor's session, so no two visitors see the identical mesh. The mesh is centered around a large, quiet composition: the H1 in GT Alpina serif, three lines, left-aligned, sitting on the mesh at 40% into the fold. Sub-copy below. One primary CTA ("Show me on our data"), one text link ("How it reads a policy →"). NO product screenshot above the fold.
- Below the mesh, a hairline horizontal rule, then a **product theater** section that scroll-locks: as the user scrolls, a single product view — the compliance field — assembles piece by piece. First the workforce grid appears (nodes for each employee), then policies overlay as a translucent layer, then risk activity begins pulsing on a subset of nodes, then the "resolve" flow demonstrates itself. This is the "wow" moment. It runs once, does not loop, and the user can scroll past it.

**Signature motion / interaction:**
The mesh **responds** to two things. First, the user's cursor: it warps subtly with a slight parallax and warmth-shift toward the cursor position. Not enough to notice consciously, enough to feel alive. Second, the mesh **breathes** on a 12-second cycle — a slow chromatic drift from cool-bias to warm-bias and back. On mobile / reduced-motion: static mesh with two-layer parallax on scroll only.

The product-theater scroll-lock is the second signature moment. When done at the fidelity of Apple product pages or the Vercel v0 launch, it becomes the thing customers screenshot and share on LinkedIn. That's the marketing engine.

**Product-UI hint:**
The app itself doesn't run shaders — the mesh lives on marketing only. But the **spirit** carries: the app has a very soft gradient wash on the top nav (Aurora fading into Bloom, at ~4% opacity), and every "AI is working" state uses the field mesh as a subtle progress-shimmer instead of a spinner. Chat / Ask-Pilot uses a soft rounded input with an ambient mesh glow inside when active. Otherwise the UI is Ink-on-Paper, calm, exactly like Concept A but a hair warmer.

**Integrations story visual:**
A single quiet composition: partner logos as **nodes** arranged around a center mark (AI HR Pilot's own logo), connected by hairlines that occasionally pulse a color from the mesh. Not a slideshow, not a cloud, not a scroll — one still composition with 8 seconds of lifecycle animation. Section headline: "Feeds the field from every system your workforce touches."

**Real risks:**
- Slop risk. If the mesh is even 15% too saturated, or if it covers too much of the fold, or if it moves too fast, the whole thing reads as generic-AI-marketing-slop. This concept has the narrowest execution corridor of the five.
- Performance. WebGL on the marketing page is a real ask. Needs a lightweight canvas implementation (paper-shaders or Stripe's minigl-style approach), aggressive LOD for mobile, and a still-image fallback for reduced-motion / low-power devices.
- Buyer says "pretty but I still don't know what it does." Mitigation: the product-theater section directly under the fold must be relentlessly concrete about what the product does — no more mesh, all product.
- Reads as generic AI-startup to a jaded technical buyer. Mitigation: the serif type carries the differentiation load. Sans-serif Field would definitely fail.

---

### Concept C — LEDGER

**Philosophy:** the institutional register done right. This is what The Protocol was reaching for and missed. Rather than khaki+forest (private-equity pitch deck aesthetic that reads slightly precious and slightly old-money), Ledger is the register of a modern private bank or a serious research institution — cold ivory, deep ink, and one deliberate accent. Authority without costume.

**Comparable brand:** Harvey AI (the closest analog by miles). Federal Reserve research portal. The Atlantic redesigned. Newer Bridgewater materials. Bloomberg's editorial (not Terminal) side.

**Who this appeals to:** the compliance-load-bearing side of the buyer stack. Head of HR bringing this to CFO / General Counsel. Also PE operators who read authority as underwriting shorthand. This concept lets HR sell up internally: "this is a serious tool."

**Positioning line:**
> "The compliance record of your workforce, kept properly."
Sub: "AI HR Pilot maintains a defensible, court-ready record of every workforce decision — read against every applicable statute, in every state you operate, continuously."

Notice the language shift from Signal/Field: this is the concept where the copy leans on *record*, *defensible*, *court-ready*. Compliance-first framing.

**Logo direction:**
A monogram. Two letters: **AP** (AI Pilot) or **HP** (HR Pilot), set in a custom-drawn didone-adjacent serif with an unbroken horizontal bar underneath — an underscore that reads as both a stamp and a ledger line. The mark is engraveable. It works foiled on a physical report cover, embossed on a business card, and rendered as a favicon. It has no color — Ink or knockout only.

Wordmark: full "AI HR Pilot" set beside the monogram in a smaller sans, Ink, no adornment.

Avatar: monogram-only on Ink field.

**Full palette:**
- Ink #0B0F1A (deep near-black with a hair of blue, not brown — this is the anti-khaki move)
- Ivory #F4F1EA (cold cream — warmer than paper white, colder than cream. If you squint it reads "trade-book page under a reading lamp," not "linen tablecloth")
- Vermilion #C8321F (single deliberate accent — used sparingly, only for the ledger-underscore mark, for the state of a citation that failed, and for one CTA. Vermilion is the accent because it's not a color other HR software owns. It reads publisher's cinnabar, not tech-red)
- Slate #2A3140 (dark UI surfaces, sidebar in the app)
- Parchment #E8E3D6 (secondary surface, quiet cards)
- Graphite #4A4E58 (secondary text)
- Old-gold ONLY for one purpose: the seal-of-authenticity marker on generated reports. It never appears in navigation, hero, or CTAs. If we bring gold in at all — see risks below — it stays in the report artifact layer, not the marketing site.

Explicit anti-khaki controls: no olive, no sage, no forest green, no ochre, no burlwood, no brass on-screen. If the Protocol direction was Tuscan farmhouse, Ledger is New York Public Library reading room.

**Typography pairing:**
- Display: **GT Sectra Fine** at 64/80/96px hero. Sectra is a modern serif with a slightly displaced axis — reads sharp and contemporary, not roman-classical. This is what stops it from being Protocol 2.0.
  - (Alternate: **Signifier** by Klim. Free alternate: **Newsreader** or **Cormorant Garamond** with tight tracking.)
- UI: **National 2** (Klim) for body and UI. Neo-grotesque with a slight editorial warmth.
  - (Free alternate: **Inter** or **Söhne**.)
- Mono: **Söhne Mono** or **JetBrains Mono** for citations, statute numbers, timestamps.

The typographic move: **use serif for the assertion, mono for the citation**. Every headline claim in the site body is followed by a mono-set citation ("NY Lab. Law §201-d(3)"). That single detail is the entire Ledger aesthetic in miniature and it does more brand-building work than any hero effect.

**Hero pattern:**
- Editorial layout, not a hero card. Top-left: small mono eyebrow ("Filed 2026 — AI HR Pilot"). Beneath it: a large serif H1 in three lines, left-aligned, sitting on a 12-column grid. Sub-copy on the right column. Below: a **live citation block** — a real workforce policy line ("Employees in states with pay-transparency laws: 4,201") followed by a mono citation to the exact statutes that apply, followed by a Vermilion "read the standing analysis" link.
- Above the fold: no product screenshot. The page reads more like a leading paragraph of a paper of record than a tech landing page.
- A single hairline rule at 80% of the fold. Beneath it, one CTA row: "Request a workforce audit" (Vermilion pill, Ivory text) and "How the record is kept →" (Ink underline).
- Directly below the fold: a **standing analysis table**. Rows of real statutes, each with the count of the client's affected employees, each with a "current status" pill (green: clear, amber: pending review, vermilion: exposure). This table is the product manifesting on the marketing page — much closer to a Bloomberg data pane than to a marketing feature card.

**Signature motion / interaction:**
Extremely restrained. Motion is not the brand — precision is. The one animated moment: the standing analysis table has one live cell that updates every few seconds ("Last review: 3 seconds ago"). The whole page feels **still and current** rather than motion-y. Think of the difference between a live financial ticker (Ledger) and a screensaver (Field) — same technical trick, opposite emotional register.

Secondary interaction: hovering any statute citation opens a small popover (Söhne Mono, Ivory on Ink) showing the exact clause and the AI's interpretation with a "verify against source" link. That's the "wow" moment. It reads like Bloomberg Terminal met Notion footnotes.

**Product-UI hint:**
The app dashboard is a two-column reading experience: left is the ledger (chronological record of every workforce event and every AI decision on it), right is context (the current policy, the current statute, the AI's reasoning, the audit trail). Ink text on Ivory in reading areas; Slate panels for the tools. Vermilion only for status: cleared / pending / exposure. Ask-Pilot chat is styled as a marginalia rail — the AI's responses appear as annotations in a right-hand column, not as chat bubbles. The whole product feels like reading a legal treatise with an intelligent assistant marking it up in the margin.

**Integrations story visual:**
A single serif-set paragraph: "AI HR Pilot reads from Slack, Microsoft Teams, BambooHR, Workday, Rippling, Okta, ADP, Google Workspace and Notion — and writes nothing until an authorized reviewer signs the record." No logos. No grid. Just the sentence, set larger than body, one Vermilion word. This is the flex — the confidence of not needing a logo cloud.

Below it, a small mono-set "connectors read at least once every 24 hours; last full sync: 04:12 UTC" that ties it to the live-record spine of the brand.

**Real risks:**
- If the type is even 5% too classical, it collapses back into Protocol. GT Sectra vs Newsreader is the difference; text-cut serif at hero size would break the entire concept.
- Vermilion at the wrong hex will read Christmas or Marxist rather than publisher's cinnabar. #C8321F is the corridor; #FF4136 kills it, #A02020 kills it.
- Buyer says "cold." Ledger is intentionally cold — that's the anti-khaki move. If the founder ultimately wants warmth, this concept is wrong and Field or Atrium is right.
- Reads as "law firm software" if we're not careful about balancing the compliance framing with operational-efficiency copy. Every hero and section headline needs to earn back the operator side of the value prop.

**Ledger vs Protocol — the explicit contrast:**
| | Protocol (previous) | Ledger (this) |
|---|---|---|
| Palette | Cream, forest, brass | Cold ivory, deep ink, vermilion |
| Serif | Roman / classical (warm, precious) | Modern didone / editorial (sharp, current) |
| Register | Old family estate | New York publishing house |
| Emotional read | Trustworthy but slightly precious | Trustworthy and current |
| Vs. buyer | Reads slightly nostalgic | Reads professional |
| Motion | None | Restrained, live-record cues |
| Signal color | Brass (soft, decorative) | Vermilion (sharp, functional) |

If the founder's "too khaki" note meant "too precious / too nostalgic / too costume," Ledger fixes it. If it meant "I want warmth but different warmth," Ledger will fail and Field is the answer.

---

### Concept D — CONSOLE

**Philosophy:** the product IS the page. No marketing narrative wrapping the product; the product runs live on the homepage and the visitor is invited to watch it work. This is Cursor taken further, or what Bloomberg Terminal would ship if it re-launched today.

**Comparable brand:** Cursor. Perplexity Enterprise. Retool. Modal. The Attio dashboard aesthetic. Late-2025 v0.dev preview pages. On the finance side: Bloomberg Terminal, but rendered by Vercel.

**Who this appeals to:** COO / PE operator hardest of any concept. This is the "shut up and show me it working" direction. Weakest for a first-time HR buyer who wants a warm welcome — Console does not welcome. It performs.

**Positioning line:**
> "Watch it clear a compliance queue in real time."
Sub-copy is optional. The page argues by demonstration, not by claim.

**Logo direction:**
Monospaced glyph — literal characters. `AIHR//P` set in the brand mono font, tightly kerned, with the `//` in the accent color. That's the wordmark. Mark alone is `//P`. Reads as a namespace, a path, an instrument. Feels engineering-native without being twee about it. In the app it becomes a status-line prefix.

Avatar: `//P` in accent color on Ink field.

**Full palette:**
- Ink #08090C (deepest near-black, cool-bias — this is the console background)
- Surface #12141A (elevated panels, cards, terminal windows)
- Line #1E212B (dividers, grid overlays)
- Sodium #F5C518 (accent — the amber of a Bloomberg Terminal function key, but sharper. Used for `//`, for the primary CTA, for one live-cursor)
- Emerald #34D399 (status: clear / pass / resolved)
- Rose #F87171 (status: exposure / block / fail)
- Cyan #7DD3FC (status: reading / processing / links)
- Bone #E7E6E1 (primary text)
- Fog #7B7E88 (secondary text, metadata)
- (Light mode: technically supported but the brand lives in dark. The light variant is for compliance-officer readable exports of console output.)

**Typography pairing:**
- Display: **Söhne Mono** or **Berkeley Mono** at 40/48/56px — headlines in monospace. This is the strongest single visual commitment of the concept.
- UI: **Söhne** Buch for body text (used sparingly — most of the page is mono).
- Mono: **Söhne Mono** everywhere else.
- (Alternates: **JetBrains Mono** + **Inter**, or **Geist Mono** + **Geist**.)

The mono-headline move is what makes Console feel bleeding-edge and confident. Sans-serif headlines here would collapse the concept into "Linear clone."

**Hero pattern:**
- The upper 20% of the fold is a single line, mono, Bone on Ink: `//pilot > compliance_scan --all --live`
- Directly below that, one line H1 in mono: **"Watch it work."**
- Sub-copy, one line: "Live workforce compliance for 4,201 employees across 38 states. Not a demo — the real product, on real data."
- Beneath: **a full-width live console panel**, 65% of the fold height. It is the product. Left rail: the queue (rows of workforce events awaiting compliance decisions). Center: the active event being reasoned on, with the AI's chain-of-thought streaming in mono, character-by-character. Right rail: the standing risk register (statutes, states, counts, statuses). A cursor blinks in the AI reasoning stream.
- The visitor can click on any queue item to jump the AI to that one. **Yes — the visitor can interact with the console without signing up.** That's the demo.

**Signature motion / interaction:**
The full-page live console. The AI reasoning streams in real character-cadence (not a canned canned type-writer effect — actual streaming from a real model). When a decision resolves, a status pill flips (rose → emerald most of the time; occasionally amber-to-rose for an exposure event that gets routed to a "Yuri (Head of HR) queued" state). Every resolution briefly highlights the corresponding statute in the right rail.

Second interaction: the top-right of the console has a mono command box. Visitor can type `/explain last decision` or `/audit last week` and the AI responds in the same stream. This is the "wow moment" that gets screenshotted.

Third: a small mono footer counter constantly increments — "42,914 decisions made this week across 128 workspaces." Real number, not fake.

**Product-UI hint:**
The app is a single-page console — the marketing page IS the app onboarding. The app adds: workspace switcher (top-left), team members, integration settings, audit history, and export. Every module in the app inherits the mono-headline + terminal-status-line aesthetic. The Ask-Pilot chat is not a bubble UI at all — it's a `>` prompt at the bottom of every panel and the AI response appears inline. Settings pages are also mono-headed with sans body.

**Integrations story visual:**
A live mono log. As the visitor watches, log lines stream: `[04:12:03] slack ✓ 47 messages read`, `[04:12:04] workday ✓ 12 employees updated`, `[04:12:05] bamboohr ✓ 3 policies re-read`, `[04:12:06] okta ✓ 4 role changes indexed`. The section headline: "Reads from all of them. Writes only what you approve." No logo grid, no cards, no scroll. Just log.

**Real risks:**
- Excludes buyers who want to feel welcomed. Head of HR who is not tech-forward may bounce in 3 seconds. Mitigation: a "prefer a guided view?" link that reveals a calmer walk-through panel — but this defeats the concept if we lean on it. Better: accept the segmentation. Console is for the COO / operator ICP. HR buyers who like Console come along; those who don't were never the primary anyway.
- Live-console engineering is real work. Non-negotiable: the visible AI stream must be a real model call, not a scripted animation. The moment a technical buyer inspects the network tab and finds a static JSON blob, credibility is dead.
- Reads as too much like Cursor's marketing to a designer who's seen it. Mitigation: Sodium amber is not a color Cursor owns — it lands us in Bloomberg-Terminal territory instead. Different reference stack.
- If the console is dense and hard to read on mobile, the whole concept collapses on 40% of traffic. Needs a genuinely well-designed mobile console — probably a vertical stack of the three rails, with the AI stream taking primary focus.

---

### Concept E — ATRIUM (wildcard)

**Philosophy:** compliance risk is not a spreadsheet problem, it's a human one — real people, real decisions, real stakes. The site is a documentary-realism film about a workforce, with the AI diagnostics layered over it as a quiet HUD. This is the "wow but doesn't scare" direction taken all the way: cinematic full-bleed video, but of real work, with real diagnostic overlays. Apple product-film aesthetic meets Palantir Foundry's HUD.

**Comparable brand:** Apple product pages (M-series launches). Palantir Foundry marketing. Anduril. The current OpenAI enterprise page. Airbnb's original "belong anywhere" moment, but for operators.

**Who this appeals to:** the CEO / founder / board-facing audience. The buyer's boss. This is the concept the buyer forwards to their principal to justify the purchase. Also strong for HR heads who are tired of feeling like they're selling insurance instead of a business.

**Positioning line:**
> "Every decision your workforce makes, understood in the moment."
Sub: "AI HR Pilot watches the day happen. It flags what your policies say, what the law requires, and what needs your call — before the day ends."

**Logo direction:**
A soft, near-abstract symbol: an **atrium mark** — a circle intersected by two rising vertical lines, evoking a courtyard, a light-well, a place where things are seen from above. Slightly humanist, slightly architectural. Wordmark in a warm humanist sans (Söhne Breit or GT Alpina Sans Regular). The mark works foiled on a physical card, in an animated intro, and as a favicon glyph.

Avatar: the mark alone, static (never animated in avatars).

**Full palette:**
- Ink #101418 (rich near-black, cinematic — the color of a graded documentary frame)
- Bone #F3F0EA (warm off-white — but this is a support color; most of the site is video)
- Ember #E2542A (sharp, deliberate — used for HUD accent and for the one primary CTA)
- Field-green #6DBE7E (HUD "clear" status)
- Amber #F6B940 (HUD "review" status)
- Steel #445062 (secondary UI, subtitle backgrounds)
- Fog #A6ABB5 (metadata)

Grade note: all video on the site is color-graded to a warm-shadow / cool-highlight look with slightly desaturated skin tones — think Apple's "Made on iPhone" tone, not a stock-footage bright-and-cheerful look. That grade IS the brand.

**Typography pairing:**
- Display: **GT Alpina Sans** (or **Söhne Breit** Halbfett) at 56/72px. Warm humanist sans. Never serif — Ledger owns the serif register in this system.
- UI: **Söhne** Buch/Kräftig 15/16.
- Mono: **Söhne Mono** only for HUD numerics and telemetry.
- (Alternates: **Inter Display + Inter + JetBrains Mono**.)

**Hero pattern:**
- Full-bleed cinematic video, muted, plays on load. What's on screen: not stock footage, not a product screenshot — a **real workforce moment** shot in documentary register. Options: an office manager reviewing a request on a laptop; a warehouse supervisor checking a schedule on a tablet; a nurse-manager taking a call. Grade is warm, slow, composed. Ambient sound-design available (off by default).
- Overlaid on the video, positioned in the lower third: a floating **HUD** — a thin translucent bar with three telemetry readouts in mono: `SHIFT: T+04:12`, `POLICIES READ: 47`, `RISKS FLAGGED: 2 (ROUTED TO YURI)`. The HUD updates as the video plays, so by the second loop the visitor sees "Yuri" appear as a resolution state.
- H1 in warm sans, over the video, top-left, three lines. One primary CTA (Ember pill) inset from the bottom-left.
- Above the fold: nothing except video, HUD, headline, CTA.

**Signature motion / interaction:**
The **HUD-over-video** is the entire signature. It is what makes Atrium not-a-generic-hero-video. The HUD is engineered to feel like the AI is watching the same scene the visitor is watching, and thinking out loud. If the visitor scrolls, the video pins in the background at 25% opacity and the HUD lifts to become the primary composition — a moment of transition from "documentary" to "product." That transition IS the moment.

Secondary: the HUD's `RISKS FLAGGED` counter is a clickable pill. Clicking it opens an overlay that shows the actual AI reasoning for one of the flagged risks in the scene the visitor just watched. So the film becomes the demo.

**Product-UI hint:**
Two visual modes in the app. Default is a **Situation Room** — the workforce feed rendered as an ambient dashboard with soft video-still backgrounds (not literal video in the app; that would be too much) and the HUD elements from the marketing page carrying through as the actual live-status chrome. Ask-Pilot lives as an ambient assistant pill in the bottom center, always available, always calm. The alternative mode ("Reader") is a dense chronological ledger for the compliance-heavy days — think of it as Console-lite grafted onto Atrium.

Ember appears in the app only when the AI is asking for a human decision. That single use makes the color earn its brand-load.

**Integrations story visual:**
A quiet full-bleed shot, no video — a still of a workforce environment (say, a bright open office with people at desks). Overlaid on the image: hairline connections drawn to the corners, each terminating in a small integration mark (Slack, Teams, BambooHR, Workday, etc.) with a soft field-green live-status dot. Section headline in warm sans: "Sees what your workforce systems already know."

**Real risks:**
- Video is expensive to produce well. If we shoot stock or cast obviously-actor talent, the entire concept collapses into "corporate video 2018." Non-negotiable production budget or borrow-fidelity via a real customer partnership.
- HUD-over-video reads as Palantir/defense/surveillance to some audiences. That's fine for a COO but can trigger a reflexive "big brother" reaction from an HR head. Mitigation: the HUD language is unambiguously *helpful* — routes to a named person, offers a decision, never displays surveillance-style data on individuals.
- Video-first hero is a bandwidth and performance ask. Needs the video hosted at Vercel-tier CDN quality with a genuinely elegant poster-frame fallback.
- If we get any of the four sub-choices wrong (grade, cast, sound, HUD design), the whole concept fails visibly. Highest execution-risk of the five.
- Wildcard label is honest. This is a swing.

---

## 4. Head-to-head comparison

| Dimension | A. Signal | B. Field | C. Ledger | D. Console | E. Atrium |
|---|---|---|---|---|---|
| Aesthetic era read | 2026 restrained | 2026 ambient | 2026 editorial | 2026 technical | 2026 cinematic |
| Primary buyer fit | COO ★★★★★ / HR ★★★ | COO ★★★ / HR ★★★★ | COO ★★★ / HR ★★★★★ | COO ★★★★★ / HR ★★ | CEO/Board ★★★★★ / COO ★★★★ / HR ★★★ |
| "Wow" quotient | 6/10 (confidence, not spectacle) | 9/10 (motion is the wow) | 5/10 (authority is the wow) | 8/10 (product-as-demo) | 10/10 (cinematic hero) |
| "Doesn't scare" | 9/10 | 7/10 | 9/10 | 5/10 | 7/10 |
| Anti-khaki score | 10/10 | 9/10 | 8/10 (deliberately cold) | 10/10 | 8/10 |
| Engineering cost | Medium (live feed) | High (WebGL system) | Low (mostly type + typography) | High (real live console + real model calls) | Highest (film production + HUD system) |
| Time to first shipped version | 3-4 wks | 5-6 wks | 2-3 wks | 4-6 wks | 8-12 wks (film shoot in critical path) |
| Longevity (will it look dated by 2027) | Very high | Medium (mesh trend has ~18-month tail) | Very high | High | Medium-high (documentary grade holds) |
| Differentiation from HR competitors | High | High | Very high (nobody in HR is here) | Very high (nobody in HR is here) | Very high (nobody in HR is here) |
| Reference brand analog | Linear / Ashby | Stripe / Anthropic | Harvey AI / Federal Reserve | Cursor / Bloomberg Terminal | Apple product film / Palantir |
| Risk of AI-slop read | Very low | Medium (execution corridor is narrow) | Very low | Very low | Low |
| Fits "AI-native" claim | Implicitly (via live feed) | Aesthetically (via motion) | Editorially (via live citations) | Explicitly (via visible AI stream) | Narratively (via HUD) |

---

## 5. Recommended top 2

### Top pick: **Signal (Concept A)**

Signal is the concept most likely to *ship well* and *hold up for three years* against a COO / PE-operator buyer without cornering us on any single execution risk. The live compliance feed on the hero is a genuinely defensible piece of design engineering — it demonstrates AI-nativeness by *behaving* AI-native rather than *claiming* it. The palette is confident and distinctive (Signal-lime against warm off-white is a lane nobody in HR software currently occupies). The typography leaves us headroom to feel premium without leaning on a serif crutch that could re-trigger the "too traditional" concern. Most importantly, Signal reads as *recognition* of the buyer — a page that says "we already know what you actually do" rather than a page that pitches to them. That is the tone of every enterprise tool that has actually moved into the operator's stack in the last three years (Linear, Ramp, Ashby).

The failure mode is bounded: if it lands under-differentiated, we still have a beautiful, calm, credible site that is meaningfully better than any HR competitor. If it lands well, it's the exact aesthetic of "AI-inside operator tool, 2026."

### Runner-up: **Ledger (Concept C)**

Ledger is the concept that most decisively solves the compliance-authority side of the value prop, and it does so in a way that maps directly onto the founder's underlying credential stack (3× CHRO, JD). It also lets the site be *the* answer to a real market gap — nobody in HR tech is playing at Harvey AI's aesthetic level for the compliance-serious segment. If the founder's mental model of buyer is "the person who has to defend this in a deposition," Ledger is the concept that wins deals in that room.

Ledger's specific advantage over Signal: it inherits the "grown-up" feel the Protocol direction was reaching for, without the khaki costume. The vermilion-on-cold-ivory palette and modern didone-serif treatment reads *contemporary institutional* rather than *nostalgic institutional* — which is precisely the shift the founder's feedback implied was needed.

### Honorable mention: **Console (Concept D)**

Console is the most technically impressive concept and the one a technical PE operator would fall in love with. If the founder has the appetite and the engineering budget for a real live-console hero (with a real streaming model behind it), Console would generate the most inbound "how did you build that?" attention of any of the five. It is also the highest-risk on segment coverage — HR-side buyers who don't self-identify as operators will bounce. Recommend Console only if we're willing to make the strategic call that the ICP is COO/PE-operator with HR as a secondary influence rather than a co-equal.

### Not recommended as primary
- **Field (Concept B)** is beautiful but the execution corridor is narrow enough that I'd only pick it if we're already confident in the shader/WebGL engineering budget. If the mesh reads even a hair generic, we've lost.
- **Atrium (Concept E)** is a swing worth taking only if the founder can commit to real film production. As a fallback with stock or actor footage, it fails harder than any of the other concepts fail. Consider it as a Series A moment, not the current homepage.

---

## 6. Honest read on the "too khaki" concern

The founder's Protocol feedback was that it was a "big improvement" but "too khaki." I want to name what that phrase probably means beneath the surface, because it changes which of the five concepts is actually right.

"Too khaki" can mean two very different things:

**Reading 1: "The palette specifically felt earthy/olive/beige, and I want a different palette."**
If this is what the founder means, then any of the four alternatives to Protocol solve it. Signal (lime on warm neutral) is a full palette pivot; Ledger (vermilion on cold ivory) is a palette pivot within the same institutional family; Field (warm indigo on paper with a vivid mesh reserved for shader-only use) is a chromatic pivot; Console (dark, sodium-amber, cool-bias) is the maximum contrast against khaki; Atrium (cinematic-graded video with warm-shadow / cool-highlight) is a category pivot away from color palettes altogether.

**Reading 2: "The direction specifically felt too traditional, too costume, too old-money, too precious — and I want to feel modern-AI-native, not vintage-authority."**
This is the more likely reading given the founder's other cues ("modern July 2026 AIxHR aesthetic," "bleeding-edge," "AI-native HRIS"). Under this reading, the fix is NOT swapping colors within the institutional register. The fix is stepping out of the institutional register entirely and into the operator/AI-native register — which is the family Signal, Field and Console live in.

Under this reading:
- **Signal is the clearest anti-khaki move.** It is the opposite emotional register — restrained modern operator, not composed institutional gentleman.
- **Field is a strong anti-khaki move** in a different direction (ambient / AI-native).
- **Console is the maximum-contrast anti-khaki move.**
- **Ledger is genuinely different from Protocol** but it is still in the institutional register — cold ivory instead of warm cream, modern didone instead of roman classical, vermilion instead of brass. It fixes the *costume* problem but retains the *authority* voice. Only recommend Ledger as primary if the founder specifically wants to keep the authority voice and just modernize its execution.

My honest read of the founder's cues: reading 2 is closer to true, and the founder actually wants the *operator/AI-native* register more than they want an institutional register at all. Under that assumption, the strongest bet is Signal, with Console as a bolder alternative if the ICP is decisively COO-first.

If we go into a preview build phase, the highest-value thing to test would be a single side-by-side: **Signal vs Ledger on the same hero copy and the same product feed.** One page in each aesthetic, shown to five COOs and three HR heads, five-minute think-aloud each. That test is decisive because it disambiguates the two readings of "too khaki" and it does so on the real buyer, not on the founder.

The three remaining concepts (Field, Console, Atrium) are more expensive to prototype and I would not spend the test cycles on them until the core register question is resolved.

---

**End of report.** File saved at `C:\Users\yurik\Downloads\policypilot-ai\HOMEPAGE_REDESIGN_2026_CONCEPTS.md`.

### Sources consulted for market state
- [Rippling AI product marketing page](https://www.rippling.com/platform/ai) — Rippling's current AI positioning and platform framing.
- [Harvey AI — Rebuilding the design system](https://www.harvey.ai/blog/rebuilding-harveys-design-system-from-the-ground-up) — Harvey's dark-mode chroma tuning, hue-locking approach and cross-surface design system.
- [Harvey AI — Homepage refresh (Feb 2026)](https://help.harvey.ai/release-notes/homepage-refresh) — Streamlined marketing homepage refresh.
- [Glean — Work AI homepage](https://www.glean.com/) and [May 2026 launch](https://www.glean.com/blog/may-2026-launch) — enterprise AI coworker framing.
- [HiBob — Brand evolution and new logo](https://www.hibob.com/blog/hibob-announcing-new-logo/) — recent HiBob rebrand and system.
- [Stripe design tokens on DesignMD](https://designmd.cc/benchmarks/stripe) — Stripe's core palette, sohne-var type stack, and gradient-mesh implementation notes.
- [Vercel design system on DesignMD](https://designmd.cc/benchmarks/vercel) — Vercel's Geist/Geist-Mono system, monochrome core, blueprint-grid pattern.
- [Notion DESIGN.md](https://designmd.directory/p/notion-design-md) — Notion's warm-neutral surfaces and restrained blue accent.
- [Aesthetics in the AI era — 2026 web-design trends](https://medium.com/design-bootcamp/aesthetics-in-the-ai-era-visual-web-design-trends-for-2026-5a0f75a10e98) — the "techno-futurist vs editorial" split shaping current SaaS aesthetics.
- [Best 3D websites of 2026 — MDX](https://mdx.so/blog/best-3d-websites-2026-examples) — current-state WebGL/three.js hero patterns and where they work vs. fail.
- [SaaS dashboard design examples 2026 — 925 Studios](https://www.925studios.co/blog/saas-dashboard-design-examples-2026) and [Attio / Hex / Cursor AI-native dashboard notes](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/) — the shift from Bloomberg-density dashboards to AI-summarized dashboards.
- [Lattice / 15Five / Culture Amp comparison — PeoplePilot](https://www.peoplepilot.io/blog/lattice-vs-culture-amp-2026) — current-state performance-management HR tools and their marketing register.
- [Cursor for designers guide — ADPList](https://adplist.substack.com/p/a-designers-guide-to-cursor-and-claude) — Cursor's stripped-down marketing register and product-first hero pattern.
