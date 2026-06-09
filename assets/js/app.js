// app.js — Welcome Baby hero stage: scaling, sprite cycle, stork follow, scene zoom, sparkle trail
'use strict';

// TODO(api): stub backend calls here as the prototype grows

// ── DOM refs ──────────────────────────────────────────────────────────────────
const stage        = document.querySelector('[data-stage]');
const sceneLayer   = document.querySelector('[data-scene-layer]');
const cloudsLayer  = document.querySelector('[data-clouds-layer]');
const storkEl      = document.querySelector('[data-stork]');
const storkFrame   = document.querySelector('[data-stork-frame]');
const cursorEl     = document.querySelector('[data-cursor]');
const speechBubble = document.querySelector('[data-speech-bubble]');

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

// Idle timer — shows speech bubble after 2 s of no mouse movement.
// Starts immediately so bubble appears if the user never moves the mouse.
let idleTimer = setTimeout(() => speechBubble.classList.add('is-visible'), 2000);

document.addEventListener('mousemove', (e) => {
  // Clamp to stage bounds so the stork target never leaves the 1366×768 space
  targetX = Math.max(0, Math.min(STAGE_W, (e.clientX - stageOffsetX) / stageScale));
  targetY = Math.max(0, Math.min(STAGE_H, (e.clientY - stageOffsetY) / stageScale));

  // Rotate cursor arrow to always point toward the door
  const angle = Math.atan2(DOOR_CENTER_Y - targetY, DOOR_X - targetX) * (180 / Math.PI);
  cursorEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px) rotate(${angle}deg)`;

  // Hide speech bubble while the mouse is moving; restart 2 s idle countdown
  clearTimeout(idleTimer);
  speechBubble.classList.remove('is-visible');
  idleTimer = setTimeout(() => speechBubble.classList.add('is-visible'), 2000);
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

let currentSceneScale = SCALE_MIN;
let targetSceneScale  = SCALE_MIN;

// Blind has its own lerp state — independent of scene zoom so it can
// target cursor position directly and animate at its own (faster) speed.
let currentBlindProgress = 0;  // 0 = fully closed (slats tall), 1 = fully open (slats 1px)

// smoothstep: smooth S-curve easing for the distance → scale mapping
function smoothstep(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
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

  // Position speech bubble above stork (stage coords; centred horizontally on stork)
  speechBubble.style.transform = `translate(${storkX - 70}px, ${storkY - 135}px)`;

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

  // — Binder / blind animation —
  // slatScaleY: 1 = native SVG height (closed), 0 = fully collapsed (open).
  // Driven by targetSceneScale (cursor position, no lag) so slats fully
  // reach 0 when the cursor is at the door.
  // currentBlindProgress lerps at 0.14 so the collapse is visible but quick.
  const BLIND_OPEN_THRESHOLD = 0.65;
  const BLIND_LERP           = 0.22;
  const blindRaw             = (targetSceneScale - BLIND_OPEN_THRESHOLD) / (SCALE_MAX - BLIND_OPEN_THRESHOLD);
  const tBlind               = Math.max(0, Math.min(1, blindRaw));
  const targetBlindProgress  = tBlind * tBlind * tBlind;
  currentBlindProgress      += (targetBlindProgress - currentBlindProgress) * BLIND_LERP;
  // Snap to target when close enough — lerp is asymptotic and never truly reaches 1
  if (Math.abs(currentBlindProgress - targetBlindProgress) < 0.02) currentBlindProgress = targetBlindProgress;
  const slatScaleY           = 1 - currentBlindProgress;
  binderEls.forEach(({ el, yTop }) => {
    if (!el) return;
    // translate-scale-translate keeps the collapse anchored to the slat's top edge
    el.setAttribute('transform',
      `translate(0,${yTop}) scale(1,${slatScaleY}) translate(0,${-yTop})`);
  });

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
