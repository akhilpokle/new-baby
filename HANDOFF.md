# Handoff — Welcome, Baby sketchbook

The delivery experience is a **flip book that builds itself from content**. When the
stork reaches the door, delivery latches and the book opens over the blurred, frozen
scene (`.delivery-backdrop`).

The pages are **real HTML**, not card images, and **the audience decides how many
there are** — so the book's structure is generated at runtime, not authored.

> **Docs:** `docs/architecture.md` now covers the derived fan geometry and the
> sketchbook DOM landmarks; `docs/gotchas.md` #17–21 cover this feature's footguns.
> This file is the orientation doc — those two are the reference.

---

## 1. What the book is

```
letter | tldr  s0 | s1    s2 | s3    s4 | closing
 open  |  leaf 0  |  leaf 1  |  leaf 2  |  end
```

A fanned deck: a **letter page** (left base) and a **closing page** (right base) with
**leaves** between them. Upcoming pages fan out on the right, read pages pile into
left-side slivers, every turned page landing flush at the spine. One leaf turns at a
time. Opens on spread 1.

Right after the letter comes a **TLDR page** — a contents-page summary, one line per
section that follows, in the same order it appears in the book. It is just another
page as far as the fan geometry is concerned (see `letterPages()` in `app.js`): the
leaf count below is `sections + 1` (the TLDR), not `sections`.

The letter content comes from `assets/newborn_mtm_templates.json` — **four complete
templates**, one per audience:

| Audience | Sections | Pages (incl. TLDR) | Leaves | Spreads |
|---|---|---|---|---|
| Male / Permanent Staff | 5 | 6 | 3 | 4 |
| Male / Direct Contract | 4 | 5 | 3 | 4 |
| Female / Permanent Staff | 6 | 7 | 4 | 5 |
| Female / Direct Contract | 5 | 6 | 3 | 4 |

Only two eligibility rules drive the difference: **Medical Protection is
Permanent-only**, **nursing rooms are Female-only**. Everything else is universal
with per-audience copy.

---

## 2. Content pipeline

```
newborn_mtm_templates.json   ← source of truth (content team)
        │  mirrored by hand
        ▼
assets/js/content.js         ← window.NEWBORN_CONTENT + NEWBORN_ILLUSTRATIONS
        │  getPersona() → resolveTemplate() → getLetter()
        ▼
buildBook(letter)            ← injects the pages into [data-sketchbook-book]
```

**The templates are pre-resolved.** The content team has already applied eligibility
per audience, so the front end does a **lookup, not a merge** — no filtering rules
live in JS. Picking a persona is a `.find()` on gender + employmentType.

**Persona** comes from the query string in this prototype, so every variant is
previewable with no backend:

```
?gender=Male&type=Direct%20Contract
```

Default is **Female / Permanent Staff** — chosen deliberately as the 6-page worst
case, so layout problems surface first. An unknown persona falls back to it rather
than rendering an empty book.

> `TODO(api)` in `app.js`: employee **name** and **gender** come from Workday. The
> `|Employee Name|` token in the templates is currently substituted with `"Toast"`.

**Why `content.js` duplicates the JSON:** nothing can load the `.json` — `fetch()` of
a local file is CORS-blocked under `file://`, and the prototype must run by
double-clicking `index.html` (same root cause as gotchas #1, which is why `app.js`
also can't be `type="module"`). **The two files can drift — edit the JSON first, then
mirror it.** Both are replaced by CMS-rendered content at Liferay handoff.

### Page templates (`app.js`)

| Renderer | Used for | Content |
|---|---|---|
| `renderLetter()` | letter page | `baby_img.jpg` hero + greeting + intro, at full text contrast (`.page-body--letter`) |
| `renderTldr()` | TLDR page | heading + lead, then each item as a heading + paragraph, then the `footer` line. No illustration |
| `renderSection()` | each section | illustration + heading + body + `coverage[]` as paragraphs + optional `note` + `links[]` |
| `renderEnd()` | closing page | centred sign-off from `window.NEWBORN_CLOSING` — **placeholder copy** |

### Page spacing is margin-based, not `gap`
The gap between two children of `.page-body` depends on which pair they are:

| Pair | Gap | Token |
|---|---|---|
| heading → paragraph | 4px | `--sketchbook-gap-heading-text` |
| anything → button | 8px | `--sketchbook-gap-content-action` |
| everything else | 6px | `--sketchbook-page-gap` (default) |

Flex `gap` can't vary per pair (and *adds* to margins rather than being replaced by
them), so `.page-body` sets no `gap` and spacing comes from `* + *` margins.
⚠️ **Those rules must stay after `.page-heading`/`.page-text` in `styles.css`** —
`.page-body > * + *` is a single class, so a later equal-specificity `margin` on
`.page-text` silently flattens the default to 0. That exact bug happened once.

### Two text formats only
Every page uses exactly two: **`.page-heading`** (14px semibold, full contrast — page
headings *and* TLDR item labels) and **`.page-text`** (13px, muted — body copy,
claim-coverage lines, notes, sign-offs). No italics, no list markers, no third size;
`coverage[]` renders as paragraphs rather than a `<ul>`. Buttons and real links are
controls, not a text format, and keep their own styling.

⚠️ **Unresolved links no longer look unresolved.** They used to carry a dotted
underline marking "no destination yet"; that was a third format and went with this
change. The 7 links still needing URLs are listed below — that table is now the only
record, since the UI no longer shows it.

`letterPages(letter)` builds one flat array — the TLDR (if the template has one)
followed by the sections — so `buildBook()` never has to know a TLDR exists; it just
maps **leaf `j` → `pages[2j]` on the front (right page), `pages[2j+1]` on the back
(left page)**. An odd page count leaves the final back face **blank** — a blank left
page facing the closing card, which is what a real book does. This is why Male/Perm
and Female/Direct (odd section counts) lost their blank page and Female/Perm and
Male/Direct (even section counts) gained one, once the TLDR page shifted parity.

**TLDR content is hand-authored, one item per section, same order as the book** — it
doubles as a table of contents, and its `footer` line points the reader at the pages
that follow. No links (the sections are one page-turn away) and no illustration: the
6-item persona needs that height budget for the list, not art. It has ~38px of
headroom on the worst case (Female/Perm) — comfortable, but nowhere near the claims
page's near-zero margin (see gotchas #19). If a template's item copy grows
materially, re-measure.

**Closing copy lives in `window.NEWBORN_CLOSING`** (top-level `closing` in the JSON),
*not* inside `templates[]` — it is the same for every audience. It replaced the
full-bleed `card-end.png`; that file is **still referenced by `variations/`**, so it
has not been deleted. The `.page-full` CSS rule went with it (nothing else used it).

Illustrations are keyed **by section heading** in `content.js` (the art is
persona-stable, so this avoids duplicating six paths across four templates).
⚠️ Reword a heading and the illustration silently drops out. Stable section IDs
would be the better key if the CMS provides them.

---

## 3. How the fan works

**There is no position table.** The leaf count follows the content, so every page
position is derived in `app.js` from one number: **depth** — how many pages sit in
front of this one on its own side of the spine.

```
right side (leaf front, closing):   left = PAGE_W + FAN_X·d
left side, flipped (leaf back):     left = PAGE_W − FAN_X·d
left side, never flipped (letter):  left = −(FAN_X − FAN_W)·d
all:                                w = PAGE_W − FAN_W·d,  z = Z_TOP − d
```

Full depth table and the reasoning → **`docs/architecture.md`**.

**Resizing the book is a two-token edit** (`--sketchbook-page-w` / `-page-h`). Fan
offsets, page heights, arrow anchors and content scale all follow. `FAN_X`/`FAN_W`
are **ratios of page width**, and `HEIGHT_RATIO` is derived from the two tokens —
don't reintroduce hard-coded positions or a duplicate ratio constant.

**Page content is SCALED, not resized.** Each page's content sits in a fixed
`page-w × page-h` box (`[data-page-content]`) fitted to its narrower fan slot with
`transform: scale()`. Sizing the box directly would re-flow the copy on every frame
of a flip. The box's `transform` transition must stay in sync with the leaf's
`width` transition — both use `--sketchbook-flip-duration` / `-flip-ease` (gotchas #18).

**Focus is scoped to the current spread.** Every page is in the DOM at once, so
`applyScene` sets `inert` on everything at depth ≠ 0 and on the hidden face of the
two active leaves. Without it, `Tab` walks into buried off-screen pages (gotchas #21).

### Navigation
- Circular arrows flank the book, anchored to `--sketchbook-content-left/right`,
  which **JS writes from the leaf count** (a deeper fan reaches further, so these
  can't be static tokens). Disabled at the bounds.
- **Keyboard:** ← / → while the book is open.
- **Edge click-zones:** thin `aria-hidden` strips over each page's outer edge.
- **Caption:** visually-hidden `aria-live="polite"` region, generated from the
  section headings on show.
- **Input lock:** `isFlipping` blocks input for the flip duration (`setTimeout`, not
  `transitionend`, so it can't stick).
- **Close** dismisses the backdrop and resets. Delivery latches once per session —
  no re-open is wired.

### Reduced motion
`prefers-reduced-motion: reduce` sets `transition: none` on `.leaf`, `.page` **and
`.page__content`**, and `FLIP_MS = 0` — pages turn instantly, navigation intact.
`.page__content` must be named explicitly; `transition: none` doesn't inherit.

---

## 4. Files

| File | Role |
|---|---|
| `assets/newborn_mtm_templates.json` | **Source of truth** for letter content |
| `assets/js/content.js` | Verbatim JS mirror of the JSON + illustration map |
| `assets/js/app.js` | Persona resolution, `buildBook()`, fan geometry, nav |
| `index.html` | Book **shell only** — pages are injected, not authored |
| `assets/css/styles.css` | `.sketchbook*`, `.leaf*`, `.page*`, `.page__content`, link styles |
| `assets/css/tokens.css` | Sketchbook token block |
| `assets/img/baby_img.jpg` | **Letter page hero** — in use, do not remove |
| `assets/img/more-time.jpg` … `care-and-support.jpg` | 6 section illustrations, 720px wide |
| `assets/img/card-*.png` | Original card art — **only used by `variations/`** now; the live closing page is HTML, not `card-end.png` |

### Key tokens (`tokens.css`)
`--sketchbook-page-w` (340) / `-page-h` (485) — the two you'd change to resize.
`-page-h` is **measured against the tallest page**, not chosen (see the warning above).
`--sketchbook-fan-x-ratio` (0.04375) / `-fan-w-ratio` (0.03125) — fan shape.
`--sketchbook-illo-ratio` (0.4417 = 318/720) / `-illo-bg` (#FEF4F3) — illustration band.
`--sketchbook-page-pad` / `-page-gap` — text column (see the headroom warning below).
`--sketchbook-flip-duration` (700ms) / `-flip-ease`, `-perspective` (1200px),
`-radius` (16px), `-book-tilt` (5deg), `-edge-thickness`, `-arrow-size` / `-arrow-gap`.
`--sketchbook-content-left` / `-right` are **JS-derived** — the values in `tokens.css`
are only a first-paint fallback.

### Illustrations
All six are 720px wide with an identical **~318px blush panel** (`#FEF4F3`); the band
crops to that panel so every page's text starts at the same height. Filenames are
kebab-case on purpose — GitHub Pages is case-sensitive and spaces need encoding
(gotchas #11). Keep new art to that pattern.

---

## 5. Open items

### ⚠️ Page height is measured, not guessed — overruns clip silently
`--sketchbook-page-h` is `485px`, sized against the **tallest measured page**: the
claims page (477px), leaving only **8px of slack**. Everything else has 45px+ spare.

The claims page is the tallest in **all four personas** (identical copy), so a
per-persona height would compute the same 477px four times — there is nothing to
gain there. 477px is also close to the floor: 150px of it is the illustration band,
and pixel-sampling all six JPGs shows artwork running to the bottom of the blush
panel in every one, so cropping tighter cuts art rather than whitespace. Widening
the page doesn't help either (the band scales with width). Full analysis in
gotchas #19.

`.page__content` is `overflow: hidden`, so an overrun **disappears off the bottom
with no error**. This number has moved four times, each as a side effect of another
edit rather than a resize request — 420 (shipped broken) → 585 (a `.page-text` type
change) → 490 (summary items collapsing to one line) → 498 (`--sketchbook-page-pad`
12/18 → 16) → 485 (slack trimmed to 8px). Re-measure after **any** type, copy or
padding change (method in gotchas #19); never assume the claims page is still the
tallest. With only 8px of slack there is now very little room for error.

At 485px the book fits the 640px-tall floor with no scrolling (485 + 120px backdrop
padding = 605px).

### Links need destinations — 7 of 9 have none
| Link | State |
|---|---|
| `Apply for leave now` | ✅ real Workday URL |
| `Submit Claim` | ⚠️ URL **missing its protocol** in the JSON — `normaliseUrl()` patches it at render, but **fix the source** |
| `Update your dependant's details…`, `More info on medical benefits here`, `Access iOK here` | ❌ name a CMS template (`linkText`), no URL |
| `Parental Benefits`, `Flexible Work Arrangements`, `Family Deals`, `Nursing Rooms: …` | ❌ label only, no destination |

Unresolved links render inert but **look identical to resolved ones** now that the
dotted-underline cue is gone (see "Two text formats only" above). They need real
URLs, or confirmation that Liferay resolves the `linkText` template references.

### Button vs text link is a placeholder rule
`links[]` mixes actions (`Submit Claim`) with prose (`Update your dependant's details
in People Hub, including their NRIC/FIN number`) and **no field distinguishes them**.
Current rule: label ≤ 30 chars → button, longer → inline text link
(`LINK_BUTTON_MAX_CHARS` in `app.js`). **A `kind`/`style` field per link is the real
fix.**

### Content questions for the content team
- **Closing page copy is PROTOTYPE-WRITTEN, not theirs.** The page is now real HTML
  (`window.NEWBORN_CLOSING`), replacing `card-end.png` — whose copy duplicated
  "Discover other benefits" verbatim and whose 👍/👎 control was part of the image and
  never clicked. Needs their words, and a decision on whether the feedback control
  comes back as a working element (`TODO(api)` in `content.js`).
- **TLDR page copy is also prototype-written** — one summary line per section, plus
  the "flip through the pages" footer. Needs their review for tone and accuracy.
- **`Staff Deals`** (Male/Perm) vs **`Family Deals`** (other three) — same link,
  different label. Intentional?
- **Male/Perm intro omits "As you return to work,"** which the other three have.
- **Medical Protection body is longer for Female than Male** (F-Perm adds a
  higher-plan enrolment paragraph). Is medical detail really gender-dependent?
- `"Access iOK here."` appears both at the end of `body` and as the link label.

### Housekeeping
- `welcome-baby-prototype.zip` — untracked build artifact, still **not** in
  `.gitignore`.
- `variations/variation-1.html` / `-2.html` still reference `card-1…6.png`. Those
  PNGs are otherwise unused by the live book — don't delete them without pruning
  `variations/` too.

---

## 6. Testing

Run `serve.bat` (or the `dbs-new-baby` config in `.claude/launch.json`) →
http://localhost:3000. Double-clicking `index.html` must also work — that constraint
is why `content.js` exists.

**Test in a real, focused browser tab.** In a hidden/backgrounded tab Chromium pauses
`requestAnimationFrame` **and CSS transitions**, and defers `img.decode()` — the
loader never clears, animations don't run, and screenshots stall. Environment quirk,
not a bug (gotchas #15).

Fast path to the book without flying the stork:

```js
document.querySelector('[data-backdrop]').classList.add('is-visible');
// then use the arrows, ← / →, or:
document.querySelector('.sketchbook__arrow--next').click();
```

**Check all four personas** — they exercise different leaf counts and the odd-count
blank page:

```
?gender=Female&type=Permanent%20Staff   6 sections / 3 leaves
?gender=Female&type=Direct%20Contract   5 sections / 3 leaves + blank
?gender=Male&type=Permanent%20Staff     5 sections / 3 leaves + blank
?gender=Male&type=Direct%20Contract     4 sections / 2 leaves
```

Worth re-checking after any layout change: no horizontal overflow at **1024px** (the
book does **not** scale with the stage — gotchas #17); text doesn't re-wrap mid-flip;
the card scales smoothly rather than snapping; open/close snaps with no animation;
`Tab` only reaches links on the visible spread.

---

## 7. Git state

- Last commit: **`753851d`** — *"Restyle page buttons, fix dead hover, add persona
  switcher"*. The content pipeline, derived geometry and real HTML pages are all
  committed as of `99b6e5c`/`753851d`.
- **Uncommitted:** the TLDR summary page, the HTML closing page (replacing
  `card-end.png`), the two-text-format typography pass, the spine gutter, and the
  485px page height.
  Modified: `app.js`, `content.js`, `newborn_mtm_templates.json`, `styles.css`,
  `tokens.css`, `HANDOFF.md`, `docs/architecture.md`, `docs/gotchas.md`.
