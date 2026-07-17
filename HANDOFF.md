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
letter | s0    s1 | s2    s3 | s4    s5 | closing
 open  |  leaf 0  |  leaf 1  |  leaf 2  |  end
```

A fanned deck: a **letter page** (left base) and a **closing page** (right base) with
**leaves** between them. Upcoming pages fan out on the right, read pages pile into
left-side slivers, every turned page landing flush at the spine. One leaf turns at a
time. Opens on spread 1.

The letter content comes from `assets/newborn_mtm_templates.json` — **four complete
templates**, one per audience:

| Audience | Sections | Leaves | Spreads |
|---|---|---|---|
| Male / Permanent Staff | 5 | 3 | 4 |
| Male / Direct Contract | 4 | 2 | 3 |
| Female / Permanent Staff | 6 | 3 | 4 |
| Female / Direct Contract | 5 | 3 | 4 |

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
| `renderLetter()` | letter page | `baby_img.jpg` hero + greeting + intro |
| `renderSection()` | each section | illustration + heading + body + optional `coverage[]` bullets + optional `note` + `links[]` |
| `renderEnd()` | closing page | still the original `card-end.png` art |

`buildBook()` maps **leaf `j` → `sections[2j]` on the front (right page),
`sections[2j+1]` on the back (left page)**. An odd section count leaves the final
back face **blank** — a blank left page facing the closing card, which is what a real
book does.

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
| `assets/img/card-*.png` | Original card art — **still used by `variations/`**; `card-end.png` is the live closing page |

### Key tokens (`tokens.css`)
`--sketchbook-page-w` (360) / `-page-h` (440) — the two you'd change to resize.
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

### ⚠️ The claims page has ~zero headroom and clips silently
`Pregnancy/new-born related claims` needs **439px of the 440px** page height — every
other page has 34–154px spare. `.page__content` is `overflow: hidden`, so when it
breaks the button just **disappears off the bottom with no error**. Nobody notices in
review.

Any change to type, `--sketchbook-page-pad`, `--sketchbook-page-gap`, or that
section's copy can break it. **Recommended fix: `--sketchbook-page-h: 460px`** — one
token, restores ~20px, still fits a 640px-tall window. (Gotchas #19.)

### Links need destinations — 7 of 9 have none
| Link | State |
|---|---|
| `Apply for leave now` | ✅ real Workday URL |
| `Submit Claim` | ⚠️ URL **missing its protocol** in the JSON — `normaliseUrl()` patches it at render, but **fix the source** |
| `Update your dependant's details…`, `More info on medical benefits here`, `Access iOK here` | ❌ name a CMS template (`linkText`), no URL |
| `Parental Benefits`, `Flexible Work Arrangements`, `Family Deals`, `Nursing Rooms: …` | ❌ label only, no destination |

Unresolved links render inert and visibly provisional (dashed border / dotted
underline). They need real URLs, or confirmation that Liferay resolves the
`linkText` template references.

### Button vs text link is a placeholder rule
`links[]` mixes actions (`Submit Claim`) with prose (`Update your dependant's details
in People Hub, including their NRIC/FIN number`) and **no field distinguishes them**.
Current rule: label ≤ 30 chars → button, longer → inline text link
(`LINK_BUTTON_MAX_CHARS` in `app.js`). **A `kind`/`style` field per link is the real
fix.**

### Content questions for the content team
- **Closing page copy** — not in the JSON, so `card-end.png` stands in. Its body text
  duplicates "Discover other benefits" verbatim and looks like placeholder. The 👍/👎
  feedback is baked into the PNG and doesn't click.
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

- Last commit: **`0e087f6`** — *"Add page-edge thickness to the flip animation"*.
- **Everything in this document is uncommitted** — the content pipeline, derived
  geometry, real HTML pages, the 360×440 resize, accessibility scoping, and the docs
  updates. Modified: `index.html`, `app.js`, `styles.css`, `tokens.css`,
  `docs/architecture.md`, `docs/gotchas.md`. Untracked: `content.js`,
  `newborn_mtm_templates.json`, the 6 illustration JPGs.
