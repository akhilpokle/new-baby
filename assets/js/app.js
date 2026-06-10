// app.js — Welcome Baby hero stage: scaling, sprite cycle, stork follow, scene zoom, sparkle trail
'use strict';

// TODO(api): stub backend calls here as the prototype grows

// ── DOM refs ──────────────────────────────────────────────────────────────────
const stage        = document.querySelector('[data-stage]');
const sceneLayer   = document.querySelector('[data-scene-layer]');
const cloudsLayer  = document.querySelector('[data-clouds-layer]');
const storkEl      = document.querySelector('[data-stork]');
const storkFrame   = document.querySelector('[data-stork-frame]');

// ── Sparkle trail ─────────────────────────────────────────────────────────────
const SPARKLE_COLORS   = ['#FFD700', '#FFB8B8', '#FFFFFF'];
let   lastSparkleTime  = 0;
const SPARKLE_INTERVAL = 50; // ms — one sparkle per 50ms max

function createSparkle(x, y) {
  const el = document.createElement('div');
  el.className   = 'sparkle';
  el.textContent = '✦';
  const ox = (Math.random() - 0.5) * 20;
  const oy = (Math.random() - 0.5) * 20;
  const color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
  el.style.cssText = `left:${x + ox}px;top:${y + oy}px;color:${color};transform:rotate(${Math.random() * 360}deg)`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}


// Binder slats — window blind inside the SVG.
// Each entry: SVG element id + the y-coordinate of its TOP edge in SVG space.
// The transform scales each slat from its own top edge downward, so they all
// collapse upward together — like a blind being raised.
const BINDER_DEFS = [
  { id: 'binder',   yTop: 415 },
  { id: 'binder_2', yTop: 426 },
  { id: 'binder_3', yTop: 447 },
  { id: 'binder_4', yTop: 437 },
  { id: 'binder_5', yTop: 458 },
  { id: 'binder_6', yTop: 469 },
];
const binderEls = BINDER_DEFS.map(d => ({
  el:   document.getElementById(d.id),
  yTop: d.yTop,
}));

// Home-deco reveal — the rest of the window scene, choreographed off the same
// cursor→house proximity that drives the binders. Each element starts translated
// OUT of the fixed window clip (clip1: x2795–2976, y415–479) so it is hidden, then
// animates back to translate(0,0). SVG units (the scene's own coordinate space).
const peopleEl    = document.getElementById('people');                 // jumps up from below the sill
const decoEl      = document.getElementById('deco');                   // slides in from the right
const imageEl     = document.getElementById('image 1 [Vectorized]');   // slides in from the left
const image35851El = document.getElementById('image 35851');           // small rect, slides in from left

// Hide-offsets: how far each element sits outside the window clip when fully hidden.
const PEOPLE_HIDE_Y = 60;  // push people down below the sill (y446→506, past clip bottom 479)
const DECO_HIDE_X   = 50;  // push deco right, past the window's right edge
const IMAGE_HIDE_X  = 60;  // push image(s) left, past the window's left edge

// Binder: distance-driven, opens only when the cursor is genuinely close to the house.
const BINDER_OPEN_DIST = 190; // stage px from the house box where the blind starts rolling up

// Entrance (people + deco + image): a time-based one-shot, NOT tied to cursor distance.
// It plays forward over ENTRANCE_DURATION once the cursor crosses into the house area,
// then snaps hidden the instant the cursor leaves. TRIGGER_IN/OUT give a little hysteresis
// so hovering right at the edge doesn't flicker.
const ENTRANCE_DURATION   = 280; // ms — quick "instant" burst
const ENTRANCE_TRIGGER_IN  = 150; // px: enter the house area → start the entrance
const ENTRANCE_TRIGGER_OUT = 190; // px: leave past this → snap hidden

// ── Read tuning values from CSS custom properties ─────────────────────────────
// Liferay devs adjust these in tokens.css; JS reads once at init
const css = getComputedStyle(document.documentElement);
const EASE_FACTOR   = parseFloat(css.getPropertyValue('--ease-factor'))      || 0.1;
const SCALE_MIN     = parseFloat(css.getPropertyValue('--scene-scale-min'))  || 0.35;
const SCALE_MAX     = parseFloat(css.getPropertyValue('--scene-scale-max'))  || 1.6;
const SPRITE_FPS    = parseFloat(css.getPropertyValue('--sprite-fps'))       || 10;

// ── Reduced motion ────────────────────────────────────────────────────────────
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease          = reducedMotion ? 0.25 : EASE_FACTOR; // snappier = less smooth travel
const spriteFps     = reducedMotion ? 4    : SPRITE_FPS;
const MAX_ROTATION  = reducedMotion ? 0    : 15;          // degrees

// ── Stage coordinate space ────────────────────────────────────────────────────
const STAGE_W = 1366;
const STAGE_H = 768;

// ── Step 5: Responsive stage scaling ─────────────────────────────────────────
// Stage is position:fixed top-left, transform-origin:top left.
// Store scale/offset so coordinate conversion can use them directly
// instead of relying on getBoundingClientRect() which can be unreliable
// for fixed+transformed elements across browsers.
let stageScale   = 1;
let stageOffsetX = 0;
let stageOffsetY = 0;

function scaleStage() {
  stageScale   = Math.max(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  stageOffsetX = (window.innerWidth  - STAGE_W * stageScale) / 2;
  stageOffsetY = (window.innerHeight - STAGE_H * stageScale) / 2;
  stage.style.transform = `translate(${stageOffsetX}px, ${stageOffsetY}px) scale(${stageScale})`;
}

window.addEventListener('resize', scaleStage);
scaleStage();

// ── Step 6: Sprite cycle ──────────────────────────────────────────────────────
// All frames are preloaded into Image objects before animation starts.
// Without preloading, each setInterval tick issues a new network request;
// on a remote host (e.g. GitHub Pages) the response takes longer than the
// interval, so the browser cancels every request and no frame ever renders.
const FRAMES = [
  'assets/img/FLIGHT.png',
  'assets/img/FLIGHT-1.png',
  'assets/img/FLIGHT-2.png',
  'assets/img/FLIGHT-3.png',
  'assets/img/FLIGHT-4.png',
  'assets/img/FLIGHT-5.png',
];

let frameIndex = 0;

// Preload — create one Image per frame and wait for all to decode.
// The interval only starts once every image is in the browser cache,
// so src swaps are instant regardless of network latency.
const preloaded = FRAMES.map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

const loaderEl  = document.querySelector('[data-loader]');
const minDelay  = new Promise(resolve => setTimeout(resolve, 800));

Promise.all([
  ...preloaded.map(img => img.decode().catch(() => {})),
  minDelay,
]).finally(() => {
  // Fade out loader
  loaderEl.classList.add('is-hidden');
  loaderEl.addEventListener('transitionend', () => loaderEl.remove(), { once: true });

  // Start wing animation now that all frames are cached
  setInterval(() => {
    frameIndex = (frameIndex + 1) % FRAMES.length;
    storkFrame.src = FRAMES[frameIndex];
  }, Math.round(1000 / spriteFps));
});

// ── Step 7: Stork cursor follow ───────────────────────────────────────────────

// Stork state — stage coordinates
const startX  = parseFloat(storkEl.dataset.startX) || STAGE_W / 2;
const startY  = parseFloat(storkEl.dataset.startY) || STAGE_H / 2;
let storkX    = startX;
let storkY    = startY;
let targetX   = startX;
let targetY   = startY;
let prevX     = startX;
let prevY     = startY;
let lastFlip  = 1;  // remembered between frames so stork holds direction when idle

document.addEventListener('mousemove', (e) => {
  // Clamp to stage bounds so the stork target never leaves the 1366×768 space
  targetX = Math.max(0, Math.min(STAGE_W, (e.clientX - stageOffsetX) / stageScale));
  targetY = Math.max(0, Math.min(STAGE_H, (e.clientY - stageOffsetY) / stageScale));

  // Sparkle trail — throttled to one per SPARKLE_INTERVAL ms
  const now = performance.now();
  if (now - lastSparkleTime > SPARKLE_INTERVAL) {
    createSparkle(e.clientX, e.clientY);
    lastSparkleTime = now;
  }
});

// Cursor stays visible — the stork follows the cursor rather than replacing it

// ── Scene zoom ────────────────────────────────────────────────────────────────
// Zoom anchor in stage coordinate space.
// x=683 = horizontal centre of stage (SVG is centred, house is mid-SVG).
// y=768 = bottom of stage (ground level) — keeps the ground pinned to the
//         screen bottom at every scale value.
const DOOR_X        = 683;
const DOOR_Y        = 768;
// Door centre y in unscaled stage coords (SVG y centre=(409+525.941)/2=467 × scale 580/645 + 188).
// Used for the cursor arrow's directional angle — not for zoom/transform-origin.
const DOOR_CENTER_Y = 608;

// Distance from door to the far corner of the stage — used to normalise cursor distance
const MAX_DIST = Math.hypot(DOOR_X, DOOR_Y);

// Main-house bounding box in stage coords — drives the binder/blind reveal.
// Derived from the house geometry in the inline SVG (roof+wall span x 2564–3196,
// y 71–527) mapped through the scene transform: stage = svg × (580/645) + offset
// (offset_x = −1759, offset_y = +188), matching --scene-x-offset in tokens.css.
//   x: 2564→547, 3196→1115   y: 71→252, 527→662
// Recompute these if scene.svg / the house art changes.
const HOUSE_BOX = { x0: 547, y0: 252, x1: 1115, y1: 662 };

let currentSceneScale = SCALE_MIN;
let targetSceneScale  = SCALE_MIN;

// Binder openness — distance-driven lerp state (0 = blind down, 1 = fully rolled up).
let binderProgress = 0;
// Entrance progress — time-driven (0 = people/deco/image hidden, 1 = fully revealed).
// Advances over ENTRANCE_DURATION while the cursor is in the house area; snaps to 0
// on leave. entranceOn latches the trigger for hysteresis.
let entranceProgress = 0;
let entranceOn       = false;

// smoothstep: smooth S-curve easing for the distance → scale mapping
function smoothstep(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

// easeOutBack: ease-out with overshoot — rises past 1 then settles, giving the
// people their "surprised jump" before landing in the window.
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}


// ── rAF loop ──────────────────────────────────────────────────────────────────
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min(now - lastTime, 50); // cap delta to avoid huge jumps on tab-switch
  lastTime = now;

  // — Lerp stork toward cursor —
  storkX += (targetX - storkX) * ease;
  storkY += (targetY - storkY) * ease;

  // Hard boundary: beak is now at the wrapper origin (0,0).
  // Frame extends: 30px left of beak, 197px right; 91px above beak, 82px below.
  // Clamp so the full sprite stays inside the 1366×768 stage.
  storkX = Math.max(30, Math.min(STAGE_W - 197, storkX));
  storkY = Math.max(91, Math.min(STAGE_H - 82,  storkY));

  // — Velocity for directional rotation —
  const velX = storkX - prevX;
  const velY = storkY - prevY;
  prevX = storkX;
  prevY = storkY;

  // Rotate toward direction of travel, clamped ±MAX_ROTATION.
  // Only update angle and flip when actually moving — this preserves the last
  // facing direction when the stork comes to rest (no snap-back to left).
  let angle = 0;
  if (Math.hypot(velX, velY) > 0.05) {
    angle    = Math.atan2(velY, velX) * (180 / Math.PI);
    angle    = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, angle));
    lastFlip = velX > 0.05 ? -1 : 1;
  }

  // Apply to wrapper only — frame cycling happens on the inner img independently.
  // 8 px beak offset: cursor leads the beak slightly in the direction of travel.
  // lastFlip=1 (left-facing) → render 8px right so cursor is 8px left of beak.
  // lastFlip=-1 (right-facing) → render 8px left so cursor is 8px right of beak.
  const beakOffsetX = lastFlip === 1 ? 8 : -8;
  storkEl.style.transform = `translate(${storkX + beakOffsetX}px, ${storkY}px) rotate(${angle}deg) scaleX(${lastFlip})`;

// — Scene zoom: map cursor distance to door → scale —
  const dist       = Math.hypot(targetX - DOOR_X, targetY - DOOR_Y);
  const normalised = Math.min(dist / MAX_DIST, 1);          // 0 = at door, 1 = far away
  const t          = smoothstep(1 - normalised);            // invert: near door = high t
  targetSceneScale = SCALE_MIN + t * (SCALE_MAX - SCALE_MIN);
  currentSceneScale += (targetSceneScale - currentSceneScale) * 0.06;
  sceneLayer.style.transform = `scale(${currentSceneScale})`;

  // — Cloud parallax + proximity fade —
  // Scale: clouds move at 50% of scene delta → appear farther away (parallax).
  const cloudScale = 1 + (currentSceneScale - 1) * 0.5;
  cloudsLayer.style.transform = `scale(${cloudScale})`;

  // Opacity: fade clouds to 50% when stork approaches home (scale > 1.0 → SCALE_MAX).
  // smoothstep keeps the fade gradual rather than linear.
  const fadeFraction  = smoothstep(
    Math.max(0, Math.min(1, (currentSceneScale - 1) / (SCALE_MAX - 1)))
  );
  cloudsLayer.style.opacity = 1 - fadeFraction * 0.5;  // 1.0 → 0.5

  // — Window scene: distance-driven binder + time-driven entrance —
  // Distance from the cursor to the house box (0 when the cursor is over the house).
  const houseDX   = Math.max(HOUSE_BOX.x0 - targetX, 0, targetX - HOUSE_BOX.x1);
  const houseDY   = Math.max(HOUSE_BOX.y0 - targetY, 0, targetY - HOUSE_BOX.y1);
  const houseDist = Math.hypot(houseDX, houseDY);

  // Binders: distance-driven, reversible. Open only when the cursor is genuinely close
  // (within BINDER_OPEN_DIST). Lerp + snap so the slats settle exactly to height 0.
  const BINDER_LERP  = 0.22;
  const binderTarget = 1 - Math.min(houseDist / BINDER_OPEN_DIST, 1);
  binderProgress    += (binderTarget - binderProgress) * BINDER_LERP;
  if (Math.abs(binderProgress - binderTarget) < 0.01) binderProgress = binderTarget;
  const slatScaleY   = 1 - binderProgress * binderProgress * binderProgress; // cubic snap
  binderEls.forEach(({ el, yTop }) => {
    if (!el) return;
    // translate-scale-translate keeps the collapse anchored to the slat's top edge
    el.setAttribute('transform',
      `translate(0,${yTop}) scale(1,${slatScaleY}) translate(0,${-yTop})`);
  });

  // Entrance: time-based one-shot, independent of cursor distance once triggered.
  // Hysteresis: latch ON inside TRIGGER_IN, latch OFF outside TRIGGER_OUT.
  if (houseDist < ENTRANCE_TRIGGER_IN)  entranceOn = true;
  if (houseDist > ENTRANCE_TRIGGER_OUT) entranceOn = false;
  if (entranceOn) {
    // Play forward at a fixed rate (dt-based) — same speed regardless of mouse motion.
    entranceProgress = Math.min(1, entranceProgress + dt / ENTRANCE_DURATION);
  } else {
    entranceProgress = 0; // snap hidden the instant the cursor leaves the house area
  }

  // All three animate together off entranceProgress: people jump (overshoot), deco/image slide.
  const peopleP = reducedMotion ? smoothstep(entranceProgress) : easeOutBack(entranceProgress);
  const sideP   = smoothstep(entranceProgress);
  if (peopleEl)     peopleEl.setAttribute('transform',     `translate(0,${PEOPLE_HIDE_Y * (1 - peopleP)})`);
  if (decoEl)       decoEl.setAttribute('transform',       `translate(${DECO_HIDE_X * (1 - sideP)},0)`);
  if (imageEl)      imageEl.setAttribute('transform',      `translate(${-IMAGE_HIDE_X * (1 - sideP)},0)`);
  if (image35851El) image35851El.setAttribute('transform', `translate(${-IMAGE_HIDE_X * (1 - sideP)},0)`);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
