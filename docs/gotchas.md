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
door SVG cx = (2669.57 + 2760.85) / 2 = 2715 → `683 − 2442 = −1759 px`.

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

---

## 13. Stork speed must be `dt`-based, and the same in BOTH phases

The stork moves at a constant `--stork-speed` (px **per second**). The per-frame
step must be `STORK_SPEED * dt / 1000` — never a fixed px/frame, or speed scales
with refresh rate (twice as fast on a 120 Hz screen).

The fly-down (`flyDown`) and active loop use the **same** constant speed on purpose.
If the fly-down lags behind the cursor (e.g. the old proportional lerp), the stork
arrives at the hand-off far from the cursor and then **sprints to catch up** at the
start of active mode — which reads as a "jump to the pointer." Keep both phases on
the same speed model. `flyDown` must be called as `flyDown(now, dt)`.

---

## 14. Zoom / binder / people follow the STORK, not the cursor

Scene zoom, the binder blind, and the people reveal are all measured from the
**stork's** position (`storkX/storkY`), not the cursor (`targetX/targetY`). Driving
them off the cursor makes the world snap-zoom the instant the cursor reaches the
door while the stork is still far away. The delivery trigger was already stork-based;
everything proximity-driven now matches it. Don't switch these back to `targetX/Y`.

---

## 15. A hidden / background tab stalls the splash (testing note)

The loader waits on `img.decode()`. In a **hidden or background tab** (e.g. an
offscreen preview pane), Chromium defers `decode()` indefinitely and pauses
`requestAnimationFrame` + CSS transitions — so the loader never clears, the splash
never fades in, and screenshots time out. This is an environment quirk, **not** a
code bug. Test in a real, focused browser tab (`document.visibilityState === 'visible'`).

---

## 16. Splash overlay z-order and the two-speed fade

`.intro-overlay` (z 9999) sits **below** `.loader-overlay` (z 10000) so the loader
covers it during load. On "Let's go" the overlay's **gradient** fades slowly
(`--intro-flydown-duration`, doubling as the sky cross-fade) while its **content**
(stork/text/buttons) fades fast (0.3 s) via `.is-leaving` — otherwise the splash
stork lingers as a ghost over the descent. Keep those two durations distinct.

---

## 17. The book does NOT scale with the stage

Everything inside `<main data-stage>` lives in the 1366 × 768 coordinate space and
is scaled to cover the viewport. **`.delivery-backdrop` is outside `</main>`**, so
its `position: fixed` is genuinely viewport-relative and the book renders at raw
CSS pixels on every screen.

Consequence: the book does not shrink on a small screen. Page sizes must be chosen
against the **1024 px minimum**, not against your monitor. At `--sketchbook-page-w:
360px` the book plus arrows spans ~891 px of the 992 px available at 1024 px.

If you move the backdrop inside `.stage`, `position: fixed` will resolve against
the transformed ancestor instead of the viewport and the whole thing will move.

---

## 18. Page content must be SCALED, not resized

The fan makes background pages narrower. `applyScene` sets `width`/`height` on the
leaf, but each page's content sits in a **fixed `page-w × page-h` box**
(`[data-page-content]`) that is fitted with `transform: scale()`.

This matters because the pages now hold real text. Sizing the content box directly
would re-flow the copy on **every frame of a flip** — the text visibly re-wraps as
a page turns. Scaling makes a page behave like the card image it replaced.

Do not "simplify" this by giving `.page__content` a percentage width.

---

## 19. The claims page has ~zero height headroom, and clips SILENTLY

`Pregnancy/new-born related claims` (heading + body + 3 bullets + note + button) is
the densest page and needs **439 px of the 440 px** page height. Every other page
has 34–154 px spare.

`.page__content` is `overflow: hidden`, so when this breaks it will not error or
visibly burst — the button just disappears off the bottom. Nobody notices in review.

Anything that touches type, `--sketchbook-page-pad`, `--sketchbook-page-gap`, or
that section's copy can break it. Re-measure after such a change; the reliable fix
is `--sketchbook-page-h: 460px` (still fits a 640 px-tall window at 460 + 120 px of
backdrop padding).

---

## 20. content.js must mirror newborn_mtm_templates.json by hand

`assets/newborn_mtm_templates.json` is the source of truth, but nothing loads it:
`fetch()` of a local file is CORS-blocked under `file://` (same root cause as #1),
and the prototype must run by double-clicking `index.html`. `assets/js/content.js`
is a verbatim JS copy.

**They can drift.** Edit the JSON first, then mirror it. At Liferay handoff both are
replaced by CMS-rendered content, so the duplication is temporary — but until then
a change to only one of them is a silent bug.

---

## 21. Only the current spread may be focusable

Every page is in the DOM at once, fanned out behind the current spread. Without
guarding, `Tab` walks into buried pages — "Submit Claim" on the claims page was
reachable from spread 1 while off-screen.

`applyScene` sets `inert` on every element whose `slotAt().d !== 0`, and on the
non-showing face of the two active leaves. `inert` removes them from the tab order
**and** the accessibility tree.

If you add interactive content to a page, it inherits this automatically — but only
if it lives inside the leaf/page element. Anything portalled elsewhere will leak.

---

## 22. A transform-less child of `preserve-3d` swallows hover and clicks

`.leaf__face--front` carries `transform: rotateY(0deg)`. It looks like dead code.
**It is not** — deleting it makes every button on every front-facing page stop
responding to `:hover` and clicks.

Inside a `transform-style: preserve-3d` context, the browser only descends
hit-testing into children that have their own transform. A face with
`transform: none` becomes the hit target for its entire subtree, so the buttons
inside it never receive the pointer.

`.leaf__face--back` gets this for free from its `rotateY(180deg)` — which is why
the bug presented as *"only the one button on a back face works"* and looked like a
z-index or overlap problem. It is neither.

Note that `inert` (gotcha #21) does **not** cause or fix this: `inert` blocks focus
and clicks but does not affect `:hover` matching. The two mechanisms are unrelated.

Diagnosis trick: `document.elementFromPoint()` over the button returns the
**face**, not the button, while `elementsFromPoint()` still lists the button on top.
That disagreement is the signature of this bug.
