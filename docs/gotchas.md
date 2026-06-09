# Gotchas — Known Footguns

Things that have already broken during development. Read before touching animation or layout code.

---

## 1. No `type="module"` on the script tag

`<script type="module">` fails **silently** when the page is opened via `file://`
(Chrome enforces CORS, blocks module imports). The script tag must be a plain
`<script src="assets/js/app.js">`. `'use strict'` is added manually at the top of
`app.js` instead.

---

## 2. Scene SVG must stay inline — do not replace with `<img>`

The scene SVG is embedded directly in `index.html` (not `<img src="scene.svg">`).
It must stay inline because JS accesses `document.getElementById('binder')` through
`binder_6` to animate the window blind slats. An `<img>` tag creates an isolated
browsing context — the SVG DOM is unreachable from the outer document.

---

## 3. Inline SVG requires an explicit `width` — `width: auto` does not work

When an SVG is inlined, `width: auto` does not derive from the `viewBox` the way
it does for `<img>`. The width must be set explicitly:

```
width = viewBox_width × (desired_height / viewBox_height)
      = 6068 × (580 / 645) = 5457px
```

**Recalculate if `scene.svg` is replaced with a different viewBox.**

---

## 4. `--scene-x-offset` must be recalculated if `scene.svg` changes

`--scene-x-offset: -1511px` in `tokens.css` pins the door's x-centre to stage x=683.
The formula (also in the `tokens.css` comment):

```
rendered_w        = svgViewBoxW × (rendered_height / svgViewBoxH)
door_rendered_x   = door_svg_cx × (rendered_height / svgViewBoxH)
--scene-x-offset  = 683 − door_rendered_x
```

Current values: SVG viewBox 6068 × 645, rendered height 580 px,
door SVG cx ≈ 2441 → `683 − 2194 = −1511 px`.

If the SVG changes shape or the door moves, recalculate and update `tokens.css`.

---

## 5. Stork beak offset — do not "fix" to geometric centre

`.stork-frame` uses `left: -30px; top: -91px`. This is intentional: the beak tip
of `FLIGHT.png` sits at (30 px from left, 91 px from top) of the 227 × 173 frame.
The offsets place the **beak** at the wrapper's (0,0) origin, not the image centre.

If you "correct" this to centre the image (e.g. `left: -113px; top: -86px`),
the beak drifts away from the cursor.

**If the stork image is replaced, re-measure the beak tip coordinates in the new PNG
and update both the CSS offsets and the rAF boundary clamp values in `app.js`.**

---

## 6. `lastFlip` — only update when moving

The stork's `scaleX` direction is stored in `let lastFlip = 1`. It must only be
updated inside the `Math.hypot(velX, velY) > 0.05` guard:

```js
if (Math.hypot(velX, velY) > 0.05) {
    lastFlip = velX > 0.05 ? -1 : 1;
}
```

Moving the assignment outside this guard (or recalculating it unconditionally each
frame) causes the stork to snap back to left-facing the moment the cursor stops.

---

## 7. Cloud z-index relies on DOM order

`.clouds-layer` and `.sky` are both `z-index: 0`. Clouds appear above the sky
because `.clouds-layer` comes **later in the HTML** than `.sky`. `.scene-layer`
is `z-index: 1`, placing the house above the clouds.

Do not reorder `.sky`, `.clouds-layer`, and `.scene-layer` in the HTML without
verifying the visual layering.

---

## 8. Sprite `setInterval` must start inside `.finally()` — not before

See `docs/animation.md` (Image preloading section). Moving the `setInterval`
outside the `Promise.all().finally()` re-introduces the wings-frozen bug on
any remote host (GitHub Pages, CDN, Liferay).

---

## 9. `filter` on `position: fixed` elements causes compositor lag

`filter: drop-shadow(...)` applied to `.cursor-arrow` (which is `position: fixed`
and updates on every `mousemove`) forces the browser to repaint that layer on the
CPU instead of compositing it on the GPU. This produces visible lag.

The `filter` property on `.cursor-arrow::after` is commented out in `styles.css`.
Do not uncomment it. If a border or glow effect is needed on the arrow, use an
SVG with a built-in stroke, or replace the PNG with a design that has a built-in outline.

---

## 10. CSS variables read by JS are init-only

`--ease-factor`, `--scene-scale-min`, `--scene-scale-max`, `--sprite-fps` in
`tokens.css` are read once by `getComputedStyle` when the page loads. Updating
them in the CSS at runtime has no effect until the next full page reload.

---

## 11. GitHub Pages is case-sensitive (Linux filesystem)

Windows is case-insensitive; GitHub Pages (Linux) is not. A file named
`FLIGHT.png` will 404 if referenced as `flight.png` or `Flight.png` in the code.
Always match capitalisation exactly between filenames and `src` / `url()` references.

---

## 12. Speech bubble must be a sibling of the stork wrapper, not a child

The stork wrapper receives `scaleX(-1)` when the stork faces right. Any child
inherits this flip — text inside a child element would mirror. `[data-speech-bubble]`
must remain a **sibling** of `[data-stork]` inside `.stage` and be positioned
exclusively via JS `transform: translate(...)`.
