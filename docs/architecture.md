# Architecture — Stage, Coordinates, Z-index, File Map

## Stage coordinate system

The entire page lives in a **1366 × 768 fixed stage** (`[data-stage]`). JS applies:

```
transform: translate(offsetX px, offsetY px) scale(ratio)
```

using `Math.max(viewportW / 1366, viewportH / 768)` — **cover strategy**: the
stage always fills the viewport with no gaps. Overflow is hidden.

`transform-origin` on `.stage` is `top left`. All child pixel values are in the
**1366 × 768 coordinate space** — never mix with raw viewport pixels.

### Mouse → stage coordinate conversion

```js
stageTargetX = (e.clientX - stageOffsetX) / stageScale;
stageTargetY = (e.clientY - stageOffsetY) / stageScale;
```

`stageOffsetX / Y` and `stageScale` are module-level vars updated by `scaleStage()` on
every `resize`. They are used directly (not via `getBoundingClientRect`) because
`getBoundingClientRect` is unreliable for `position: fixed` + transformed elements
across browsers.

---

## CSS → JS token bridge

`getComputedStyle` reads these `tokens.css` variables **once at init**:

| CSS variable | JS constant | Purpose |
|---|---|---|
| `--stork-speed` | `STORK_SPEED` | Stork flight speed, **px per second** (constant) |
| `--scene-scale-min` | `SCALE_MIN` | Scene zoom minimum |
| `--scene-scale-max` | `SCALE_MAX` | Scene zoom maximum |
| `--sprite-fps` | `SPRITE_FPS` | Wing animation frame rate |
| `--intro-flydown-duration` | `FLYDOWN_DURATION` | Splash → house descent time (ms) |
| `--sketchbook-page-w` | `PAGE_W` | Page width; the spine sits at this x |
| `--sketchbook-page-h` | `PAGE_H` | Page height; `HEIGHT_RATIO = PAGE_H / PAGE_W` |
| `--sketchbook-fan-x-ratio` | `FAN_X` | Fan step-out per depth, × `PAGE_W` |
| `--sketchbook-fan-w-ratio` | `FAN_W` | Fan narrowing per depth, × `PAGE_W` |
| `--sketchbook-book-tilt` | `BOOK_TILT` | Constant lean on every page's rest angle |
| `--sketchbook-flip-duration` | `FLIP_MS` | Flip length + the input-lock window |

`--ease-factor` is **legacy** — the stork moved on a proportional lerp; it now moves
at the constant `--stork-speed`. The token is left in `tokens.css` but unused by JS.

Changing these in `tokens.css` takes effect on the next **full page reload** only.

`--sketchbook-content-left` / `--sketchbook-content-right` go the **other** way:
JS writes them from the leaf count at init (see below). The values in `tokens.css`
are only a first-paint fallback.

---

## Z-index stack

| Layer | Element | z-index | Notes |
|---|---|---|---|
| Sky | `.sky` | 0 | Base gradient fill |
| Clouds | `.clouds-layer` | 0 | Same z as sky but later in DOM → renders above sky |
| Scene | `.scene-layer` | 1 | House SVG; above clouds so house occludes them |
| Stork | `.stork-wrapper` | 4 | Above scene |
| Speech bubble | `.speech-bubble` | 6 | Sibling of stork-wrapper, above stork |
| Cursor arrow | `.cursor-arrow` | 9999 | Always on top |
| Intro splash | `.intro-overlay` | 9999 | Splash screen; fades out during fly-down, then removed from DOM |
| Loader overlay | `.loader-overlay` | 10000 | Covers everything until images load (sits above the splash) |

**Cloud z-ordering is DOM-order dependent.** `.clouds-layer` must appear **after**
`.sky` and **before** `.scene-layer` in the HTML. Changing DOM order breaks the layering.

---

## Scene zoom transform-origin

```css
.scene-layer {
    transform-origin: var(--door-origin-x) var(--door-origin-y);
    /* = 683px 768px */
}
```

- `x = 683px` — horizontal centre of the door in stage coordinates.
- `y = 768px` — **ground level** (bottom of the 1366 × 768 stage), NOT the door's
  visual centre. This keeps the ground pinned to the screen bottom at every scale value.

---

## Sketchbook — derived fan geometry

The flip book has **no position table**. The leaf count follows the content (each
audience gets 4–6 sections → 2–3 leaves), so every page position is derived in
`app.js` from one number: **depth** — how many pages sit in front of this one on
its own side of the spine.

Depth 0 = flush at the spine (the page you are reading). Each step back steps
`FAN_X` further from the spine, gets `FAN_W` narrower, and drops one z-level:

```
right side (leaf front, closing page):   left = PAGE_W + FAN_X·d
left side, flipped (leaf back):          left = PAGE_W − FAN_X·d
left side, never flipped (letter page):  left = −(FAN_X − FAN_W)·d
all:                                     w = PAGE_W − FAN_W·d,  z = Z_TOP − d
```

`left` means different things per element: a flipped leaf pivots on its left edge,
so its box `left` is the **visual right edge**. The letter page's `−(FAN_X − FAN_W)·d`
is the same `FAN_X·d` recession, minus the part the narrower width already absorbs.

Depth at scene `i`, with `n` leaves (scenes run `0…n`):

| Element | Depth |
|---|---|
| letter page (`open`) | `i` |
| leaf `j`, already turned (`j < i`) | `i − 1 − j` |
| leaf `j`, upcoming (`j >= i`) | `j − i` |
| closing page (`end`) | `n − i` |

Two leaves are always at depth 0 — `i−1` (turned, showing its back) and `i`
(upcoming, showing its front). Those are the two pages of the current spread, and
`slotAt().d === 0` is what drives **reachability**: everything else is `inert`.

Resizing the book is a **two-token edit** (`--sketchbook-page-w` / `-page-h`).
Everything above — fan offsets, page heights, arrow anchors, content scale —
follows. Do not reintroduce hard-coded positions.

---

## File map

```
dbs-new-baby/
├── index.html              — single page; scene SVG is INLINE (required, see gotchas.md)
│                             the book's pages are NOT authored here — app.js builds them
├── CLAUDE.md               — orchestrator: workflow rules + docs index
├── docs/
│   ├── architecture.md     — this file
│   ├── animation.md        — all interactive systems
│   └── gotchas.md          — known footguns
├── assets/
│   ├── newborn_mtm_templates.json  — SOURCE OF TRUTH for letter content (4 audiences)
│   ├── css/
│   │   ├── tokens.css      — all design tokens + scene tuning values
│   │   └── styles.css      — component styles
│   ├── js/
│   │   ├── content.js      — verbatim JS copy of the .json (file:// can't fetch it)
│   │   └── app.js          — single script; rAF loop drives everything
│   └── img/
│       ├── FLIGHT.png      — stork sprite frame 0 (idle / start)
│       ├── FLIGHT-1.png … FLIGHT-5.png   — sprite frames 1–5
│       ├── cursor-arrow.png              — right-pointing PNG arrow, 32 × 32 display
│       ├── baby_img.jpg                  — letter page hero (Congratulations lockup)
│       ├── more-time.jpg … care-and-support.jpg  — 6 section illustrations, 720px wide
│       └── card-*.png                    — ORIGINAL card art; still used by variations/
└── .gitignore
```

### Key HTML landmarks (by data-attribute)

| Attribute | Element | Purpose |
|---|---|---|
| `data-stage` | `<main>` | Root of the 1366 × 768 coordinate space |
| `data-scene-layer` | `<div>` | Receives scene zoom `scale()` transform |
| `data-clouds-layer` | `<div>` | Receives parallax `scale()` transform |
| `data-stork` | `<div>` | Zero-size wrapper; JS translates to cursor position |
| `data-stork-frame` | `<img>` | Sprite image; src swapped by setInterval |
| `data-speech-bubble` | `<div>` | Idle hint bubble; sibling of stork-wrapper |
| `data-cursor` | `<div>` | Fixed cursor arrow; outside `.stage` |
| `data-loader` | `<div>` | Overlay; removed from DOM after images load |
| `data-door-pulse` | `<div>` | Door hint rectangle; inside scene-layer |
| `data-intro` | `<div>` | Splash overlay (outside `.stage`); fades during fly-down, then removed |
| `data-intro-stork` | `<img>` | Splash stork; shares its frame `src` with the stage stork |
| `data-intro-go` | `<button>` | "Let's go" — starts the fly-down |
| `data-intro-skip` | `<button>` | "Skip" — jumps straight to active |
| `data-backdrop` | `<div>` | Delivery backdrop — **outside `.stage`**, so it is in viewport px |
| `data-sketchbook-book` | `<div>` | Book; `buildBook()` injects the pages into it |
| `data-sketchbook-prev/-next` | `<button>` / `<div>` | Arrows + edge click-zones |
| `data-sketchbook-caption` | `<p>` | `aria-live` spread announcement (visually hidden) |
| `data-page-content` | `<div>` | Fixed `page-w × page-h` box; `applyScene` scales it |
| `data-leaf` | `<div>` | Leaf index (0…n-1) — **generated**, not authored |
| `data-cms-ref` | `<span>` | Link whose destination is a CMS template, not a URL |
