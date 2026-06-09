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
| `--ease-factor` | `EASE_FACTOR` | Stork lerp smoothing |
| `--scene-scale-min` | `SCALE_MIN` | Scene zoom minimum |
| `--scene-scale-max` | `SCALE_MAX` | Scene zoom maximum |
| `--sprite-fps` | `SPRITE_FPS` | Wing animation frame rate |

Changing these in `tokens.css` takes effect on the next **full page reload** only.

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
| Loader overlay | `.loader-overlay` | 10000 | Covers everything until images load |

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

## File map

```
dbs-new-baby/
├── index.html              — single page; scene SVG is INLINE (required, see gotchas.md)
├── CLAUDE.md               — orchestrator: workflow rules + docs index
├── docs/
│   ├── architecture.md     — this file
│   ├── animation.md        — all interactive systems
│   └── gotchas.md          — known footguns
├── assets/
│   ├── css/
│   │   ├── tokens.css      — all design tokens + scene tuning values
│   │   └── styles.css      — component styles
│   ├── js/
│   │   └── app.js          — single script; rAF loop drives everything
│   └── img/
│       ├── FLIGHT.png      — stork sprite frame 0 (idle / start)
│       ├── FLIGHT-1.png … FLIGHT-5.png   — sprite frames 1–5
│       └── cursor-arrow.png              — right-pointing PNG arrow, 32 × 32 display
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
