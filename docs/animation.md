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
| `binder_2` | 416 |
| `binder_3` | 418 |
| `binder_4` | 417 |
| `binder_5` | 419 |
| `binder_6` | 420 |

**If `scene.svg` is replaced, measure the new y-values from the new SVG and update
`BINDER_DEFS` in `app.js`.**

### Scale range and easing

The blind has **its own independent lerp state** (`currentBlindProgress`) separate
from `currentSceneScale`. This lets it target cursor position directly (no scene-zoom
lag) while still animating at its own speed.

```js
// Module level:
let currentBlindProgress = 0;  // 0 = closed (tall slats), 1 = open (1px slats)

// Inside rAF loop:
const BLIND_CLOSED_SCALE   = 65;   // fills SVG window y=415–480
const BLIND_OPEN_THRESHOLD = 0.65; // targetSceneScale at which collapse begins
const BLIND_LERP           = 0.14; // ~2.5× faster than scene zoom (0.06)

const blindRaw            = (targetSceneScale - BLIND_OPEN_THRESHOLD) / (SCALE_MAX - BLIND_OPEN_THRESHOLD);
const tBlind              = Math.max(0, Math.min(1, blindRaw));
const targetBlindProgress = tBlind * tBlind * tBlind;   // cubic: slow start, fast snap
currentBlindProgress     += (targetBlindProgress - currentBlindProgress) * BLIND_LERP;
const slatScaleY          = 1 + (BLIND_CLOSED_SCALE - 1) * (1 - currentBlindProgress);
```

- Uses `targetSceneScale` (not `currentSceneScale`) so the blind fully collapses
  the moment the cursor reaches the door — not delayed by scene zoom lag.
- `BLIND_LERP = 0.14` gives ~250ms visible travel at 60fps — quick but perceptible.
- **Far from door** (`currentBlindProgress=0`): `slatScaleY=65` — slats fill window.
- **Near door** (`currentBlindProgress=1`): `slatScaleY=1` — native 1px height.
- No gap in either state: slats touch at scale=1, overlap at scale>1.

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

## Sparkle trail

The OS cursor is hidden globally (`html { cursor: none }`). On every `mousemove`
event (throttled to one per 50 ms), a `div.sparkle` containing `✦` is appended
to `document.body` at the client-space cursor position and removed when its
CSS animation ends.

### JS (app.js)

```js
const SPARKLE_COLORS   = ['#FFD700', '#FFB8B8', '#FFFFFF'];
let   lastSparkleTime  = 0;
const SPARKLE_INTERVAL = 50; // ms

function createSparkle(x, y) {
  const el = document.createElement('div');
  el.className   = 'sparkle';
  el.textContent = '✦';
  const ox    = (Math.random() - 0.5) * 20;
  const oy    = (Math.random() - 0.5) * 20;
  const color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
  el.style.cssText = `left:${x+ox}px;top:${y+oy}px;color:${color};transform:rotate(${Math.random()*360}deg)`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

// In mousemove handler:
const now = performance.now();
if (now - lastSparkleTime > SPARKLE_INTERVAL) {
  createSparkle(e.clientX, e.clientY);
  lastSparkleTime = now;
}
```

Sparkles are positioned in **client space** (`e.clientX / clientY`), not stage space —
they sit outside the scaled stage element so they don't skew or scale with the scene.

### CSS (styles.css + tokens.css)

```css
/* tokens.css */
--sparkle-size:     14px;
--sparkle-duration: 0.6s;

/* styles.css */
.sparkle {
    position: fixed;
    pointer-events: none;
    z-index: 9998;
    font-size: var(--sparkle-size);
    line-height: 1;
    animation: sparkle-fade var(--sparkle-duration) ease-out forwards;
    transform-origin: center;
    user-select: none;
}

@keyframes sparkle-fade {
    0%   { transform: scale(1) rotate(0deg);  opacity: 1; }
    100% { transform: scale(0) rotate(45deg); opacity: 0; }
}
```

- Each sparkle has a random ±10 px position jitter and a random initial rotation,
  giving a scattered trail rather than a rigid line.
- Colors: gold `#FFD700`, soft pink `#FFB8B8`, white `#FFFFFF` — match the baby/home theme.
- DOM cleanup is automatic: `animationend` removes the element so there is no accumulation.

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

## Door indicator pulse

The `id="indicator"` element is a `<path>` inlined in `scene.svg` (a rect slightly
larger than the door, fill `#FFB8B8`). It is animated entirely with CSS — no JS needed.
Because it lives inside the inline SVG → `.scene-layer`, it scales and pans with the
scene automatically.

```css
#indicator {
    transform-box: fill-box;       /* origin relative to element's own bounding box */
    transform-origin: center bottom; /* bottom edge pinned; grows upward + sideways */
    animation: indicator-pulse var(--indicator-duration) ease-out infinite;
}

@keyframes indicator-pulse {
    0%   { transform: scale(1);   opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
}
```

- `transform-box: fill-box` is required; without it `transform-origin` is relative to
  the SVG canvas, not the element itself.
- Duration token: `--indicator-duration: 2.5s` in `tokens.css`.
- The old `[data-door-pulse]` div and `.door-pulse` CSS have been removed.

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
