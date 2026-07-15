# Handoff — Welcome, Baby sketchbook

Summary of the work done on the delivery experience: the old **delivery card** was
replaced with an image-based **two-page flip sketchbook**. This file captures what
changed, how it works, what's still open, and how to test it.

> Scope note: none of the docs under `docs/` (architecture / animation / gotchas)
> describe the sketchbook yet. This file is the source of truth until that content
> is folded in.

---

## 1. What the sketchbook is

When the stork reaches the front door, delivery latches and the book opens over the
existing blurred, frozen scene (`.delivery-backdrop`). It is a two-page open book of
8 card images that the user pages through with a 3D flip.

**Spreads** (fixed left | right pairs):

| Spread | Left page | Right page |
|---|---|---|
| 1 | `card-open` (Congratulations) | `card-1` (More time) |
| 2 | `card-2` (Medical protection) | `card-3` (Claims) |
| 3 | `card-4` (Nursing room) | `card-5` (Discover benefits) |
| 4 | `card-6` (Be cared for) | `card-end` (Closing) |

Opens on **spread 1**. Navigation is locked to spreads 1–4.

---

## 2. How it works (architecture)

### Leaf / spread model (`app.js`, `index.html`)
The book is **5 leaves**, each a sheet with a `front` (right page) and `back` (left
page). Two of the ten faces are blank **hidden covers** so the cards pair correctly:

| Leaf | Front | Back |
|---|---|---|
| 1 | *(blank front cover — never shown)* | `card-open` |
| 2 | `card-1` | `card-2` |
| 3 | `card-3` | `card-4` |
| 4 | `card-5` | `card-6` |
| 5 | `card-end` | *(blank back cover — never shown)* |

- `currentLeaf` = how many leaves are turned to the left. Spread N ⇒ `currentLeaf = N`.
- Leaf 1 stays permanently flipped (holds `card-open` on the left); leaf 5 stays
  unflipped (holds `card-end` on the right). Only leaves 2–4 actually animate.
- Nav bounds: `MIN_LEAF = 1`, `MAX_LEAF = LEAVES - 1 = 4`. The blank covers at
  `currentLeaf` 0 and 5 are unreachable.

### Flip (`styles.css`)
- `.sketchbook__book` provides `perspective`; each `.leaf` has
  `transform-style: preserve-3d` and `transform-origin: left center` (the spine).
- `.is-flipped` rotates a leaf `rotateY(-180deg)` around the spine.
- Faces use `backface-visibility: hidden`; the `--back` face is pre-rotated 180° so
  content reads upright once turned (two 180° Y-rotations compose to a pure
  translation — no mirroring).
- **Seamless card:** no per-face border/spine; only the *outer* corners are rounded
  (`--front` rounds right corners, `--back` rounds left) and the drop shadow is cast
  outward + down so the spine seam stays clean.

### z-index (`app.js` `applyLeafZ`)
Set from JS, not CSS: flipped leaves stack on the left (newest on top), unflipped on
the right (lowest index on top); the moving leaf is boosted to `z 100` during a turn,
then settled.

### Page-stack thickness (`app.js` `renderStack`, `styles.css` `.stack-leaf`)
Decorative paper slivers behind the spread fake the book's thickness. `app.js` builds
**3 slivers per side** once; per spread it shows `right = spreads ahead`,
`left = spreads behind`, so the thickness **shifts right → left** as you advance:

| Spread | Right slivers | Left slivers |
|---|---|---|
| 1 | 3 | 0 |
| 2 | 2 | 1 |
| 3 | 1 | 2 |
| 4 | 0 | 3 |

Each sliver is page-sized, offset outward + down by its depth (`--sketchbook-stack-offset`,
4px/layer) so only its outer/bottom edge peeks past the spread.

### Navigation (`index.html`, `styles.css`, `app.js`)
- Two circular arrow buttons **flank the book**, vertically centred (`--sketchbook-arrow-size`,
  `--sketchbook-arrow-gap`). Disabled/dimmed at the bounds.
- **Keyboard:** ← / → turn pages while the book is open.
- **Edge click-zones:** thin `aria-hidden` strips over each page's outer edge (mouse).
- **Caption:** visually-hidden `aria-live="polite"` element announces each spread to
  screen readers (`CAPTIONS` array in `app.js`).
- **Input lock:** `isFlipping` blocks input for the flip duration (`setTimeout`, not
  `transitionend`, so it can't stick).
- **Close button** dismisses the backdrop and resets the book. Delivery latches once
  per session — there is no re-open wired.

### Reduced motion
`prefers-reduced-motion: reduce` sets `.leaf` / `.stack-leaf` `transition: none` and
`FLIP_MS = 0`, so pages turn instantly with navigation intact.

---

## 3. Files changed

| File | Change |
|---|---|
| `index.html` | Delivery-card markup → sketchbook (5 leaves, stack container, flanking arrows, sr-only caption) |
| `assets/css/styles.css` | Removed `.delivery-card*`; added `.sketchbook*`, `.leaf*`, `.page-img`, `.stack-leaf`, `.sr-only`; reduced-motion additions |
| `assets/css/tokens.css` | Removed card tokens; added the `Sketchbook` token block |
| `assets/js/app.js` | Removed `cardEl`; added the sketchbook module; delivery trigger opens the book |
| `assets/img/card-*.png` | 8 card designs, renamed to kebab-case (no spaces) |
| `.claude/launch.json` | Static server config (pre-existing) |

### Sketchbook design tokens (`tokens.css`)
`--sketchbook-page-w/h` (320×400), `--sketchbook-radius` (16px),
`--sketchbook-perspective` (1200px), `--sketchbook-flip-duration` (700ms) +
`--sketchbook-flip-ease`, `--sketchbook-page-bg`, `--sketchbook-card-shadow`,
`--sketchbook-zone-w` (44px), `--sketchbook-arrow-size` (48px) /
`--sketchbook-arrow-gap` (24px), `--sketchbook-stack-offset` (4px).

---

## 4. Open items / TODO

### In progress — flip "organic feel" fix
The flip animates but was reading flat/mechanical (weak perspective, no shading).
Agreed fix is three parts:

1. **Deepen perspective** — `--sketchbook-perspective: 2400px → 1200px`. **DONE.**
2. **Page-turn shading** — a `.leaf__face::after` overlay, invisible at rest (keeps
   the seamless card), that darkens the page mid-turn via a keyframe synced to the
   flip duration, triggered by an `.is-turning` class on the moving leaf. **NOT YET
   APPLIED.**
3. **Trigger + stack timing** — add/remove `.is-turning` on the moving leaf in
   `turnPage`, and move the caption/nav/stack update (`updateSketchNav`) into the
   settle callback so nothing behind the page shifts mid-turn. **NOT YET APPLIED.**

Consider whether a true paper *curl* is wanted (bigger effort — gradients/canvas);
the current approach is a rigid `rotateY` turn with depth + shading.

### Content is placeholder (confirm final copy before launch)
- `card-open` greets **"Dear toast"** (placeholder name; was "Valerie").
- `card-4` and `card-6` bodies reuse `card-2`'s "core medial plan…" text — looks like
  copy-paste placeholders that don't match their titles.
- **"medial"** is a typo for "medical" on several cards.

### CTAs are non-interactive
The **"Learn more"** buttons and the closing 👍/👎 are baked into the PNGs, so they
don't click. To make them work, overlay invisible hotspots per card — **needs the
real target URLs** (add as `// TODO(api)` in `app.js`).

### Housekeeping
- `assets/img/baby_img.jpg` (old cover photo) is now **unused** — safe to remove.
- `welcome-baby-prototype.zip` is an untracked build artifact — should be
  git-ignored or removed.

---

## 5. Testing

- Run: `serve.bat` (or the `dbs-new-baby` config in `.claude/launch.json`) →
  http://localhost:3000. Or just open `index.html`.
- **Test in a real, focused browser tab.** In a hidden/backgrounded tab Chromium
  pauses `requestAnimationFrame` + CSS transitions and defers `img.decode()`, so the
  loader/intro/stork/flip animations don't run and screenshots stall (environment
  quirk, not a bug).
- Fast path to the book without flying the stork — in the console:
  ```js
  document.querySelector('[data-backdrop]').classList.add('is-visible');
  // step through with the arrows, ← / →, or:
  document.querySelector('.sketchbook__arrow--next').click();
  ```

---

## 6. Git state

- Committed: `dfb972c` — *"Replace delivery card with two-page flip sketchbook"*
  (the first, HTML-content version of the book), pushed to `origin/main`.
- **Uncommitted** (working tree): the switch to card images, the 5-leaf
  re-architecture (seamless card, flanking arrows, page-stack thickness), and the
  in-progress flip fix — plus the 8 untracked `assets/img/card-*.png`.
