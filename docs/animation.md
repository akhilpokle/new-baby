# Animation Systems

All animation runs inside a single `requestAnimationFrame` loop in `app.js`.
There is no animation library. The loop drives: stork follow, scene zoom,
binder blind, cloud parallax, and speech bubble positioning.

---

## Stork follow

### Beak anchor (critical)

The stork frame image (`FLIGHT.png`, 227 × 173 px) has its beak tip at
approximately **(30 px from left, 91 px from top)**. The CSS offsets the frame
by `left: -30px; top: -91px` so the **beak tip sits at the wrapper's (0,0) origin**.

When JS applies `translate(storkX, storkY)` to the wrapper, the beak tracks
exactly to that coordinate. `scaleX(-1)` mirrors the image around the same origin,
so the beak stays in place and the body flips.

**Do not change these offsets without re-measuring the beak position in the PNG.**

### Lerp + boundary clamp

```js
storkX += (targetX - storkX) * ease;
storkY += (targetY - storkY) * ease;

// Clamp so the full sprite stays inside 1366×768:
// Frame extends 30px left of beak, 197px right; 91px above beak, 82px below.
storkX = Math.max(30, Math.min(STAGE_W - 197, storkX));
storkY = Math.max(91, Math.min(STAGE_H - 82,  storkY));
```

`ease` comes from `--ease-factor` in `tokens.css` (default 0.055 = gentle lag).

### Directional flip — `lastFlip`

```js
let lastFlip = 1;  // module-level; preserved between frames

if (Math.hypot(velX, velY) > 0.05) {
    lastFlip = velX > 0.05 ? -1 : 1;
}
```

`lastFlip` is **only updated when the stork is actually moving** (velocity > 0.05).
When the stork comes to rest, `lastFlip` holds the last direction — no snap-back
to the default left-facing pose. Setting it outside the velocity guard reintroduces
the snap bug.

`scaleX(1)` = facing left (default sprite orientation).
`scaleX(-1)` = facing right (mirrored).

### 8 px beak gap

```js
const beakOffsetX = lastFlip === 1 ? 8 : -8;
storkEl.style.transform =
    `translate(${storkX + beakOffsetX}px, ${storkY}px) rotate(${angle}deg) scaleX(${lastFlip})`;
```

The 8 px nudge separates the cursor arrow from the beak so the arrow stays visible
during flight. Direction: offset toward the cursor (away from the stork body).

---

## Scene zoom

The scene scales around the door position as the stork approaches.

```js
const dist       = Math.hypot(targetX - DOOR_X, targetY - DOOR_Y);
const normalised = Math.min(dist / MAX_DIST, 1);       // 0 = at door, 1 = far corner
const t          = smoothstep(1 - normalised);          // invert: near = high t
targetSceneScale = SCALE_MIN + t * (SCALE_MAX - SCALE_MIN);
currentSceneScale += (targetSceneScale - currentSceneScale) * 0.06;
sceneLayer.style.transform = `scale(${currentSceneScale})`;
```

`SCALE_MIN` (0.35) and `SCALE_MAX` (1.6) come from `tokens.css`.
`smoothstep()` gives an S-curve so the zoom accelerates near the door and
decelerates far away — avoids a jerky linear mapping.

### Door coordinates (stage space)

```js
const DOOR_X        = 683;   // stage centre x — door is pinned here by --scene-x-offset
const DOOR_Y        = 768;   // bottom of stage — ground level (zoom anchor y)
const DOOR_CENTER_Y = 608;   // door's visual centre y — used ONLY for cursor arrow angle
```

`DOOR_Y = 768` (not the door's visual centre) because the zoom transform-origin is
at ground level. `DOOR_CENTER_Y` is a separate value used only for the cursor direction
calculation — do not conflate the two.

---

## Binder / window blind

Six SVG `<rect>` elements (ids `binder` through `binder_6`) form horizontal slats
of a window blind. Each slat collapses toward its own top edge as the scene zooms in.

### Transform pattern

```js
el.setAttribute('transform',
    `translate(0,${yTop}) scale(1,${slatScaleY}) translate(0,${-yTop})`);
```

This is a translate–scale–translate pattern: shift origin to the slat's top edge,
apply scaleY, shift back. Without the surrounding translates, the slat would collapse
toward y=0 instead of its own top.

### `yTop` values (SVG coordinate space)

These are y-coordinates in the **original SVG viewBox** (0 0 6068 645):

| id | yTop |
|---|---|
| `binder` | 415 |
| `binder_2` | 426 |
| `binder_3` | 447 |
| `binder_4` | 437 |
| `binder_5` | 458 |
| `binder_6` | 469 |

**If `scene.svg` is replaced, measure the new y-values from the new SVG and update
`BINDER_DEFS` in `app.js`.**

### Open threshold

```js
const BLIND_OPEN_THRESHOLD = 0.8;
const blindRaw = (currentSceneScale - BLIND_OPEN_THRESHOLD) / (SCALE_MAX - BLIND_OPEN_THRESHOLD);
const blindProgress = smoothstep(Math.max(0, Math.min(1, blindRaw)));
const slatScaleY = 1 - blindProgress * 0.98;  // 1 = closed, ~0.02 = fully open
```

Blinds start opening when `currentSceneScale` exceeds 0.8 and finish opening at
`SCALE_MAX` (1.6).

---

## Cloud parallax

### Layering

`.clouds-layer` sits at `z-index: 0`, same as `.sky` but **later in DOM order**,
so clouds appear above the sky gradient. `.scene-layer` is `z-index: 1`, so the
house occludes the clouds correctly. This is DOM-order dependent — do not move
the clouds layer after the scene layer in the HTML.

### Parallax scale

```js
const cloudScale = 1 + (currentSceneScale - 1) * 0.5;
cloudsLayer.style.transform = `scale(${cloudScale})`;
```

Clouds scale at **50% of the scene delta**, making them appear to be at twice the
depth of the house. `transform-origin: 683px 0px` — same x-centre as the scene,
but anchored at the sky top so clouds expand upward / outward, not toward the ground.

### Proximity fade

```js
const fadeFraction = smoothstep(
    Math.max(0, Math.min(1, (currentSceneScale - 1) / (SCALE_MAX - 1)))
);
cloudsLayer.style.opacity = 1 - fadeFraction * 0.5;   // 1.0 → 0.5
```

Clouds fade to 50% opacity as the stork approaches the door (scene scale → SCALE_MAX).

### Drift animation

Each cloud uses a CSS `animation: cloud-drift` that translates it ±12 px horizontally
over `--cloud-drift-duration` (default 24s). Each cloud has a negative `animation-delay`
so all clouds appear mid-cycle on page load (no initial snap).

---

## Custom cursor arrow

The OS cursor is hidden globally (`html { cursor: none }`). A `position: fixed`
zero-size div (`[data-cursor]`) sits outside the stage and receives:

```js
cursorEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px) rotate(${angle}deg)`;
```

The `::after` pseudo-element renders the 32 × 32 PNG (`cursor-arrow.png`), offset
`top: -16px` to vertically centre it on the origin point.

### Rotation angle calculation

```js
const angle = Math.atan2(DOOR_CENTER_Y - targetY, DOOR_X - targetX) * (180 / Math.PI);
```

`targetX / Y` are **stage coordinates** of the cursor; `DOOR_CENTER_Y` (649) is the
door's visual centre in stage space. The arrow always points from cursor toward door.

**Note:** `filter: drop-shadow` is disabled on this element. Adding it causes
compositor lag because every `mousemove` forces a repaint on a `position: fixed`
element with a filter. See `gotchas.md`.

---

## Speech bubble

`[data-speech-bubble]` is a **sibling** of `[data-stork]`, NOT a child.
(A child would inherit the `scaleX(-1)` flip and its text would mirror.)

Position is updated every rAF frame:

```js
speechBubble.style.transform = `translate(${storkX - 70}px, ${storkY - 135}px)`;
```

The `-70px` / `-135px` offsets place the bubble above and centred on the stork body.

### Idle trigger

```js
let idleTimer = setTimeout(() => speechBubble.classList.add('is-visible'), 2000);

document.addEventListener('mousemove', () => {
    clearTimeout(idleTimer);
    speechBubble.classList.remove('is-visible');
    idleTimer = setTimeout(() => speechBubble.classList.add('is-visible'), 2000);
});
```

Bubble appears after 2 s of no mouse movement; hides immediately on any movement.

---

## Door pulse

A `position: absolute` div inside `.scene-layer` (`[data-door-pulse]`):

```css
.door-pulse {
    left: 642px;    /* door_cx(683) − half_width(41) */
    top:  556px;    /* door SVG y=409 × render scale (580/645) + 188 ≈ 556px */
    width: 82px;
    height: 105px;
    animation: door-pulse var(--pulse-duration) ease-out infinite;
}

@keyframes door-pulse {
    0%   { transform: scale(1);   opacity: 1; }
    100% { transform: scale(2.6); opacity: 0; }
}
```

Lives inside `.scene-layer` so it scales and pans with the scene automatically —
no JS required.

---

## Image preloading / loader

```js
const preloaded = FRAMES.map(src => { const img = new Image(); img.src = src; return img; });
const minDelay  = new Promise(resolve => setTimeout(resolve, 800));

Promise.all([
    ...preloaded.map(img => img.decode().catch(() => {})),
    minDelay,
]).finally(() => {
    loaderEl.classList.add('is-hidden');
    setInterval(/* sprite tick */);
});
```

The `setInterval` must only start **after all frames are decoded**.
On remote servers (GitHub Pages, CDN), each 100 ms tick otherwise fires a new
network request; the response takes longer than the interval, so every request
is canceled and the wings freeze. The loader overlay (`[data-loader]`) hides
during this wait. **Do not move the `setInterval` call outside the `.finally()`.**

The 800 ms `minDelay` ensures the loader is visible long enough to read before
it disappears even on fast local connections.
