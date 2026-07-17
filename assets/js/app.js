// app.js — Welcome Baby hero stage: scaling, sprite cycle, stork follow, scene zoom, sparkle trail
'use strict';

// TODO(api): stub backend calls here as the prototype grows

// ── DOM refs ──────────────────────────────────────────────────────────────────
const stage        = document.querySelector('[data-stage]');
const sceneLayer   = document.querySelector('[data-scene-layer]');
const cloudsLayer  = document.querySelector('[data-clouds-layer]');
const storkEl      = document.querySelector('[data-stork]');
const storkFrame   = document.querySelector('[data-stork-frame]');
const backdropEl   = document.querySelector('[data-backdrop]');

// Intro splash refs
const introEl      = document.querySelector('[data-intro]');
const introStorkEl = document.querySelector('[data-intro-stork]');
const introGoBtn   = document.querySelector('[data-intro-go]');

// ── Sparkle trail ─────────────────────────────────────────────────────────────
const SPARKLE_COLORS   = ['#e95e5e', '#f7ce53', '#B0B8C0'];
const SPARKLE_GLYPHS   = ['✦', '✦', '●'];  // 2:1 sparkle-to-circle ratio
let   lastSparkleTime  = 0;
const SPARKLE_INTERVAL = 50; // ms — one sparkle per 50ms max

function createSparkle(x, y) {
  const el = document.createElement('div');
  el.className   = 'sparkle';
  el.textContent = SPARKLE_GLYPHS[Math.floor(Math.random() * SPARKLE_GLYPHS.length)];
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
const STORK_SPEED   = parseFloat(css.getPropertyValue('--stork-speed'))       || 900; // px per second
const SCALE_MIN     = parseFloat(css.getPropertyValue('--scene-scale-min'))  || 0.35;
const SCALE_MAX     = parseFloat(css.getPropertyValue('--scene-scale-max'))  || 1.6;
const SPRITE_FPS    = parseFloat(css.getPropertyValue('--sprite-fps'))       || 10;

// ── Reduced motion ────────────────────────────────────────────────────────────
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const spriteFps     = reducedMotion ? 4    : SPRITE_FPS;
const MAX_ROTATION  = reducedMotion ? 0    : 15;          // degrees

// ── Stage coordinate space ────────────────────────────────────────────────────
const STAGE_W = 1366;
const STAGE_H = 768;

// ── Intro experience ──────────────────────────────────────────────────────────
// State machine: 'splash' (overlay shown, stork idle) → 'flying-in' (overlay fades,
// world scrolls up to meet the stork) → 'active' (the existing cursor-follow game).
let introState = 'splash';
let flyInStart = 0;

const FLYDOWN_DURATION = parseFloat(css.getPropertyValue('--intro-flydown-duration')) || 3500;
const FLY_SCROLL       = STAGE_H * 2;   // "2 scrolls" of descent — world rises this far
const FLY_STORK_Y      = 115;           // wrapper y so the frame's top sits 24px below stage top (24 + 91 beak)
const CLOUD_PARALLAX   = 1.4;           // clouds travel faster than the scene → sweep past the stork
const CLOUD_REST_SCALE = 1 + (SCALE_MIN - 1) * 0.5; // matches the active loop's far-rest cloud scale (no pop on hand-off)

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
  // Fade out loader, fade in the intro splash beneath it
  loaderEl.classList.add('is-hidden');
  loaderEl.addEventListener('transitionend', () => loaderEl.remove(), { once: true });
  if (introEl) introEl.classList.add('is-visible');

  // Start wing animation now that all frames are cached.
  // Both storks (splash + stage) share the frame so the hand-off is seamless.
  setInterval(() => {
    frameIndex = (frameIndex + 1) % FRAMES.length;
    storkFrame.src = FRAMES[frameIndex];
    if (introStorkEl) introStorkEl.src = FRAMES[frameIndex];
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
let prevY       = startY;
let lastFlip    = 1;    // remembered between frames so stork holds direction when idle
let cursorClientX = window.innerWidth  / 2;  // last known client-space cursor position
let cursorClientY = window.innerHeight / 2;

document.addEventListener('mousemove', (e) => {
  // Clamp to stage bounds so the stork target never leaves the 1366×768 space
  targetX = Math.max(0, Math.min(STAGE_W, (e.clientX - stageOffsetX) / stageScale));
  targetY = Math.max(0, Math.min(STAGE_H, (e.clientY - stageOffsetY) / stageScale));

  // Track last cursor position in client space for continuous sparkle emission
  cursorClientX = e.clientX;
  cursorClientY = e.clientY;
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

// Delivery: latches true once the stork reaches the door — freezes stork/zoom/scene.
const DELIVERY_ZONE_PX = parseFloat(css.getPropertyValue('--delivery-zone-px')) || 40;
let deliveryTriggered  = false;

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

// easeOutCubic: fast start, gentle settle — the world decelerates as the house lands.
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}


// ── Intro controls ────────────────────────────────────────────────────────────
// "Let's go" — begin the fly-down. The overlay's content fades fast while its sky
// gradient fades slowly (revealing the lighter --color-sky-* beneath), so the sky
// cross-fades over the descent. The stork snaps to top-centre and holds there.
introGoBtn.addEventListener('click', () => {
  if (introState !== 'splash') return;

  // Reduced motion: skip the descent entirely, go straight to the live experience.
  if (reducedMotion) {
    introState = 'active';
    introEl.remove();
    return;
  }

  introState = 'flying-in';
  flyInStart = performance.now();

  // Park the stage stork at top-centre; from here only its x tracks the cursor.
  storkX = STAGE_W / 2; prevX = storkX;
  storkY = FLY_STORK_Y; prevY = storkY;
  lastFlip = 1;

  introEl.classList.add('is-leaving');
  introEl.classList.remove('is-visible');
});

// Fly-down frame: world rises to meet the stork; clouds sweep past faster.
function flyDown(now, dt) {
  const p  = Math.min((now - flyInStart) / FLYDOWN_DURATION, 1);
  const pe = easeOutCubic(p);

  // Scene starts FLY_SCROLL below its resting place and rises to 0.
  const sceneOffset = (1 - pe) * FLY_SCROLL;
  sceneLayer.style.transform = `translateY(${sceneOffset}px) scale(${SCALE_MIN})`;

  // Clouds travel faster than the scene so they rush up past the stork.
  const cloudOffset = (1 - pe) * FLY_SCROLL * CLOUD_PARALLAX;
  cloudsLayer.style.transform = `translateY(${cloudOffset}px) scale(${CLOUD_REST_SCALE})`;
  cloudsLayer.style.opacity   = 1;

  // Stork holds near the top (the world rises to meet it); x tracks the cursor at the
  // SAME constant speed as the live experience, so it never lags behind and there's no
  // catch-up burst the moment the house settles and active mode takes over.
  const dx    = targetX - storkX;
  const stepX = STORK_SPEED * dt / 1000;
  if (Math.abs(dx) <= stepX) storkX = targetX;       // arrive exactly, no overshoot
  else                       storkX += Math.sign(dx) * stepX;
  storkX = Math.max(30, Math.min(STAGE_W - 197, storkX));
  storkY = FLY_STORK_Y;

  const velX = storkX - prevX;
  prevX = storkX;
  prevY = storkY;

  let angle = 0;
  if (Math.abs(velX) > 0.05) {
    angle    = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, velX * 1.5));
    lastFlip = velX > 0.05 ? -1 : 1;
  }
  const beakOffsetX = lastFlip === 1 ? 8 : -8;
  storkEl.style.transform =
    `translate(${storkX + beakOffsetX}px, ${storkY}px) rotate(${angle}deg) scaleX(${lastFlip})`;

  // Landed: hand control to the live experience, leave scene/clouds exactly where
  // the active loop expects them (scale SCALE_MIN, no translate) so there's no jump.
  if (p >= 1) {
    introState = 'active';
    currentSceneScale = SCALE_MIN;
    targetSceneScale  = SCALE_MIN;
    if (introEl) introEl.remove();
  }
}

// ── Letter content (persona → template) ───────────────────────────────────────
// content.js holds four COMPLETE templates, one per audience (gender ×
// employmentType). Picking one is a lookup, not a merge — the content team has
// already applied eligibility, so section counts differ per persona (4–6) and
// the book sizes itself to whatever it is handed.
//
// Persona comes from the query string in this prototype, so every variant is
// previewable with no backend. Values match content.js exactly:
//   ?gender=Male&type=Direct%20Contract
// TODO(api): GET employee profile from Workday → { name, gender, employmentType }

const DEFAULT_PERSONA  = { gender: 'Female', employmentType: 'Permanent Staff' };
const EMPLOYEE_NAME    = 'Toast';            // stand-in until Workday supplies the real name
const NAME_PLACEHOLDER = '|Employee Name|';  // token used in the content templates

function getPersona() {
  const params = new URLSearchParams(window.location.search);
  return {
    gender:         params.get('gender') || DEFAULT_PERSONA.gender,
    employmentType: params.get('type')   || DEFAULT_PERSONA.employmentType,
  };
}

// Find the template for a persona. Falls back to the default audience so an
// unknown query string still shows a letter instead of an empty book.
function resolveTemplate(persona) {
  const templates = (window.NEWBORN_CONTENT && window.NEWBORN_CONTENT.templates) || [];
  const match = (p) => templates.find(t =>
    t.audience.gender === p.gender && t.audience.employmentType === p.employmentType
  );
  return match(persona) || match(DEFAULT_PERSONA) || null;
}

// The letter as the book renders it: a greeting/intro page, then one page per
// section. Illustrations are looked up by heading (see content.js).
function getLetter() {
  const template = resolveTemplate(getPersona());
  if (!template) return null;   // content.js missing — book stays empty

  const illustrations = window.NEWBORN_ILLUSTRATIONS || {};
  return {
    title:    template.title,
    greeting: template.greeting.split(NAME_PLACEHOLDER).join(EMPLOYEE_NAME),
    intro:    template.intro,
    sections: template.sections.map(s => ({
      ...s,
      illustration: illustrations[s.heading] || null,
    })),
  };
}

// ── Sketchbook (delivery view) ────────────────────────────────────────────────
// Fanned-deck flip book shown over the delivery backdrop once the stork arrives.
// card-open + card-end are standalone base pages; the leaves between them flip
// one at a time. Every element's per-scene layout is derived by slotAt() above;
// CSS transitions animate the change. A lock blocks input during a flip; the
// moving leaf rides above everything mid-turn; arrows disable at the bounds.
const bookEl    = document.querySelector('[data-sketchbook-book]');
const captionEl = document.querySelector('[data-sketchbook-caption]');
const prevBtns  = document.querySelectorAll('[data-sketchbook-prev]');   // arrow + edge-zone
const nextBtns  = document.querySelectorAll('[data-sketchbook-next]');

// ── Building the pages ────────────────────────────────────────────────────────
// The book is built from the resolved letter, not authored in index.html: the
// audience decides how many sections there are (4–6), so the leaf count varies.
//
//   page order:  letter | s0  s1 | s2  s3 | s4  s5 | closing
//                 open  |  leaf 0 |  leaf 1 |  leaf 2 |  end
//
// Leaf j carries sections[2j] on its FRONT (a right page) and sections[2j+1] on
// its BACK (the next spread's left page). An odd section count therefore leaves
// the final back face blank — a blank left page facing the closing card, which is
// what a real book does.

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// The content mixes two kinds of link in one links[] array with no field telling
// them apart: actions ("Submit Claim") and prose ("Update your dependant's details
// in People Hub, including their NRIC/FIN number"). Rendering a sentence as a
// button looks absurd, so they're split by label length.
// PLACEHOLDER RULE — a `style`/`kind` field on each link would be the real fix.
const LINK_BUTTON_MAX_CHARS = 30;

// Some content URLs omit the protocol ("rafflesone.rafflesmedical.com/…"), which
// the browser resolves as a RELATIVE path → 404. Normalised here so the prototype
// links work; the source JSON should be corrected too.
const normaliseUrl = (url) => (/^[a-z]+:\/\//i.test(url) ? url : 'https://' + url);

// One link. Only some entries carry a real URL; the rest name a CMS template that
// resolves at Liferay time, so they render inert rather than as a dead link.
// TODO(api): give the linkText / label-only entries real destinations.
function renderLink(link) {
  const cls = link.label.length <= LINK_BUTTON_MAX_CHARS ? 'page-btn' : 'page-link';
  if (link.url) {
    return `<a class="${cls}" href="${escHtml(normaliseUrl(link.url))}" target="_blank" rel="noopener">${escHtml(link.label)}</a>`;
  }
  return `<span class="${cls} ${cls}--unresolved" data-cms-ref="${escHtml(link.linkText || '')}">${escHtml(link.label)}</span>`;
}

// A benefit page: illustration band + heading + body + optional bullets/note + links.
function renderSection(section) {
  const art = section.illustration
    ? `<img class="page-illo" src="${escHtml(section.illustration)}" alt="">`
    : '';
  const coverage = section.coverage
    ? `<ul class="page-coverage">${section.coverage.map((c) => `<li>${escHtml(c)}</li>`).join('')}</ul>`
    : '';
  const note  = section.note ? `<p class="page-note">${escHtml(section.note)}</p>` : '';
  const links = (section.links || []).map(renderLink).join('');
  return `${art}<div class="page-body">
      <h3 class="page-heading">${escHtml(section.heading)}</h3>
      <p class="page-text">${escHtml(section.body)}</p>
      ${coverage}${note}${links}
    </div>`;
}

// The letter page: branded hero (Congratulations lockup is baked into the art,
// hence the descriptive alt) + greeting + intro.
function renderLetter(letter) {
  return `<img class="page-illo" src="assets/img/baby_img.jpg" alt="Congratulations on the arrival of your little bundle of joy.">
    <div class="page-body">
      <p class="page-text">${escHtml(letter.greeting)}</p>
      <p class="page-text">${escHtml(letter.intro)}</p>
    </div>`;
}

// Closing bookend — not part of the content templates, so the original card art
// stands in. TODO(api): real closing copy + wire the thumbs-up/down feedback.
function renderEnd() {
  return `<img class="page-full" src="assets/img/card-end.png" alt="Closing page: do you want to see more such experiences?">`;
}

// Every page's content sits in a FIXED page-w × page-h box that applyScene scales
// to its slot. Scaling (not resizing) is what stops the text re-wrapping mid-flip.
const pageContent = (side, inner) =>
  `<div class="page__content page__content--${side}" data-page-content>${inner}</div>`;

function buildBook(letter) {
  const sections  = letter.sections;
  const leafCount = Math.ceil(sections.length / 2);
  const frag      = document.createDocumentFragment();

  const open = document.createElement('div');
  open.className   = 'page page--open';
  open.dataset.card = 'open';
  open.innerHTML   = pageContent('left', renderLetter(letter));
  frag.appendChild(open);

  const leaves = [];
  for (let j = 0; j < leafCount; j++) {
    const back = sections[2 * j + 1];   // undefined on an odd count → blank page
    const leaf = document.createElement('div');
    leaf.className    = 'leaf';
    leaf.dataset.leaf = j;
    leaf.innerHTML =
      `<div class="leaf__face leaf__face--front">${pageContent('right', renderSection(sections[2 * j]))}</div>` +
      `<div class="leaf__face leaf__face--back">${pageContent('left', back ? renderSection(back) : '')}</div>` +
      `<div class="leaf__edge" aria-hidden="true"></div>`;
    frag.appendChild(leaf);
    leaves.push(leaf);
  }

  const end = document.createElement('div');
  end.className    = 'page page--end';
  end.dataset.card = 'end';
  end.innerHTML    = pageContent('right', renderEnd());
  frag.appendChild(end);

  bookEl.appendChild(frag);
  return { open, end, leaves };
}

// Per-spread caption for the aria-live region, from the headings on show.
function buildCaptions(letter, leafCount) {
  const s = letter.sections;
  const caps = [];
  for (let i = 0; i <= leafCount; i++) {
    const left  = i === 0 ? 'Congratulations' : (s[2 * i - 1] ? s[2 * i - 1].heading : null);
    const right = i === leafCount ? 'Closing'  : s[2 * i].heading;
    caps.push([left, right].filter(Boolean).join(' & '));
  }
  return caps;
}

// Leaves are addressed by INDEX (0…n-1) — the fan geometry is defined in terms of
// how many pages sit in front of a leaf, which is exactly its index.
const letter = getLetter();
const built  = (letter && bookEl) ? buildBook(letter) : { open: null, end: null, leaves: [] };

const openEl  = built.open;
const endEl   = built.end;
const leafEls = built.leaves;

const LEAF_COUNT = leafEls.length;
const LAST_SCENE = LEAF_COUNT;          // scenes 0…n — one more spread than leaves
const CAPTIONS   = letter ? buildCaptions(letter, LEAF_COUNT) : [];

// Every element the fan positions, back-to-front order irrelevant (z does that).
const sceneKeys = () => ['open', ...leafEls.map((_, i) => i), 'end'];
const elementFor = (key) =>
  key === 'open' ? openEl : key === 'end' ? endEl : leafEls[key];

// Book-open perspective: a small constant tilt added to every rest angle below,
// so the outer edge of each page leans toward the viewer instead of sitting
// perfectly flat (see --sketchbook-book-tilt). Derived from the rotateY(θ) world-Z
// formula (z' = -x·sinθ for a point at local x, pivoting at the spine): a
// right-side page (pivot at its own left/spine edge, outer edge at local +x) needs
// rot = -TILT to bring its outer edge toward the camera; a left-side page (pivot
// at its own right/spine edge, outer edge at local -x relative to that pivot)
// needs rot = +TILT. Flipped leaves land at -(180-TILT) — slightly short of a
// full half-turn — which resolves to the same +TILT lean once mirrored onto the
// left side (verified against the actual rotateY matrices during testing).
const BOOK_TILT = parseFloat(css.getPropertyValue('--sketchbook-book-tilt')) || 0;
const ROT_RIGHT   = -BOOK_TILT;          // right-side page (leaf front, card-end)
const ROT_LEFT    =  BOOK_TILT;          // left-side page, never flipped (card-open)
const ROT_FLIPPED = -(180 - BOOK_TILT);  // leaf back, now the left page

// ── Fan geometry ──────────────────────────────────────────────────────────────
// Page positions are DERIVED, not tabulated, so the book works with any number of
// leaves (audiences have 4–6 pages) and any page size (resize = two tokens).
//
// Every position falls out of one number: DEPTH — how many pages sit in front of
// this one on its own side of the spine. Depth 0 = flush at the spine (the page
// you are reading); each step further back steps FAN_X out from the spine, gets
// FAN_W narrower, and drops one z-level:
//
//   right side (leaf front, card-end):   left = PAGE_W + FAN_X·d
//   left side, flipped (leaf back):      left = PAGE_W − FAN_X·d
//   left side, never flipped (card-open) left = −(FAN_X − FAN_W)·d
//   all:                                 w = PAGE_W − FAN_W·d ,  z = Z_TOP − d
//
// card-open's formula looks odd only because `left` means different things per
// element: flipped leaves pivot on their left edge, so their box `left` is the
// VISUAL RIGHT edge, while card-open's is its true left. Both recede from the
// spine by the same FAN_X·d — the −4·d is (FAN_X − FAN_W)·d, i.e. what's left
// once the narrower width has already taken up part of the step.
const PAGE_W       = parseFloat(css.getPropertyValue('--sketchbook-page-w')) || 320;
const PAGE_H       = parseFloat(css.getPropertyValue('--sketchbook-page-h')) || 400;
const FAN_X        = PAGE_W * (parseFloat(css.getPropertyValue('--sketchbook-fan-x-ratio')) || 0.04375);
const FAN_W        = PAGE_W * (parseFloat(css.getPropertyValue('--sketchbook-fan-w-ratio')) || 0.03125);
const HEIGHT_RATIO = PAGE_H / PAGE_W;   // derived — one source of truth with the tokens
const Z_TOP        = 30;                // resting z of the spine-flush page (see docs/architecture.md)

// Depth of each element at a given scene. `leafCount` leaves → scenes 0…leafCount.
// At scene i, leaves 0…i-1 are turned (left side) and i…n-1 are upcoming (right).
// The most recently turned leaf (i-1) is flush at the spine, hence i-1-j.
function depthAt(key, i, leafCount) {
  if (key === 'open') return i;                    // behind every turned page
  if (key === 'end')  return leafCount - i;        // behind every upcoming page
  const j = key;                                   // leaf index
  return j < i ? i - 1 - j : j - i;
}

// Rest state of one element at one scene. `d` (depth) is returned too: depth 0 is
// the spread on show, which is what decides reachability (see applyScene).
function slotAt(key, i, leafCount) {
  const d = depthAt(key, i, leafCount);
  const w = PAGE_W - FAN_W * d;
  const z = Z_TOP - d;
  if (key === 'open')             return { left: -(FAN_X - FAN_W) * d, w, rot: ROT_LEFT,    z, d };
  if (key === 'end')              return { left: PAGE_W + FAN_X * d,   w, rot: ROT_RIGHT,   z, d };
  const flipped = key < i;        // leaf already turned onto the left page
  return flipped
    ? { left: PAGE_W - FAN_X * d, w, rot: ROT_FLIPPED, z, d }
    : { left: PAGE_W + FAN_X * d, w, rot: ROT_RIGHT,   z, d };
}

// The spread's widest visual extent across every scene — the arrows anchor to it.
// Deeper fans (more leaves) reach further, so this cannot be a constant.
function fanExtent(leafCount) {
  return {
    left:  -(FAN_X - FAN_W) * leafCount,                          // card-open at max depth
    right: PAGE_W + FAN_X * leafCount + (PAGE_W - FAN_W * leafCount), // card-end at max depth
  };
}

// Lock duration = the flip's visible length. Reduced motion turns instantly (CSS).
const FLIP_MS = reducedMotion ? 0 : (parseFloat(css.getPropertyValue('--sketchbook-flip-duration')) || 700);

let currentScene = 0;
let isFlipping   = false;   // input lock while a page is mid-turn

// Write a scene's rest state to every element (inline styles → CSS transitions animate).
function applyScene(i) {
  sceneKeys().forEach((key) => {
    const el = elementFor(key);
    if (!el) return;
    const s = slotAt(key, i, LEAF_COUNT);
    el.style.left      = s.left + 'px';
    el.style.width     = s.w + 'px';
    el.style.height    = (s.w * HEIGHT_RATIO) + 'px';
    el.style.transform = `translateY(-50%) rotateY(${s.rot}deg)`;
    el.style.zIndex    = s.z;

    // Fit each page's fixed-size content box to its (narrower) fan slot by SCALING
    // it. Resizing the box instead would re-flow the text every frame of a flip.
    const scale = s.w / PAGE_W;
    el.querySelectorAll('[data-page-content]').forEach((c) => {
      c.style.transform = `scale(${scale})`;
    });

    // Reachability: only the two pages ON the current spread (depth 0) may take
    // focus or be read aloud. Everything else is fanned out behind them or turned
    // face-down — without this, Tab walks into buried pages (e.g. "Submit Claim"
    // was reachable from spread 1). `inert` removes them from the tab order AND
    // the accessibility tree in one go.
    const onSpread = s.d === 0;
    el.inert = !onSpread;
    if (key !== 'open' && key !== 'end') {
      // An active leaf still shows only ONE of its two faces.
      const flipped = key < i;
      el.querySelector('.leaf__face--front').inert = !onSpread || flipped;
      el.querySelector('.leaf__face--back').inert  = !onSpread || !flipped;
    }
  });
}

// Caption + arrow disabled states for the current spread (also locked mid-flip).
function updateSketchNav() {
  if (captionEl) captionEl.textContent = CAPTIONS[currentScene] || '';
  prevBtns.forEach((b) => { if (b.tagName === 'BUTTON') b.disabled = isFlipping || currentScene <= 0; });
  nextBtns.forEach((b) => { if (b.tagName === 'BUTTON') b.disabled = isFlipping || currentScene >= LAST_SCENE; });
}

// Turn one page. dir = +1 (next) or -1 (prev).
function turnPage(dir) {
  const target = currentScene + dir;
  if (isFlipping || target < 0 || target > LAST_SCENE) return;   // locked or at a bound
  const from = currentScene;
  currentScene = target;

  // Exactly one leaf flips between adjacent scenes: leaf 0 on 1↔2, leaf 1 on 2↔3 …
  // — the leaf indexed by the lower of the two scenes.
  const movingKey = Math.min(from, target);
  const moving    = leafEls[movingKey];

  isFlipping = true;
  applyScene(currentScene);                 // targets + settled z; transitions start
  if (moving) moving.style.zIndex = 100;    // ride above everything during the sweep
  updateSketchNav();                        // lock both arrows for the turn

  setTimeout(() => {
    isFlipping = false;
    if (moving) moving.style.zIndex = slotAt(movingKey, currentScene, LEAF_COUNT).z;   // settle z
    updateSketchNav();
  }, FLIP_MS);
}

const nextPage = () => turnPage(1);
const prevPage = () => turnPage(-1);

prevBtns.forEach((b) => b.addEventListener('click', prevPage));
nextBtns.forEach((b) => b.addEventListener('click', nextPage));

// Keyboard: ← / → turn pages, but only while the book is open.
document.addEventListener('keydown', (e) => {
  if (!backdropEl || !backdropEl.classList.contains('is-visible')) return;
  if (e.key === 'ArrowRight')     nextPage();
  else if (e.key === 'ArrowLeft') prevPage();
});

// Publish the fan's widest extent to CSS — the arrows anchor to these, and a
// deeper fan (more leaves) reaches further, so they can't be static tokens.
function publishFanExtent() {
  const { left, right } = fanExtent(LEAF_COUNT);
  const root = document.documentElement;
  root.style.setProperty('--sketchbook-content-left',  left  + 'px');
  root.style.setProperty('--sketchbook-content-right', right + 'px');
}

// Reset the book to the first spread with NO animation (opening / closing).
function resetSketchbook() {
  currentScene = 0;
  isFlipping   = false;
  if (bookEl) bookEl.classList.add('is-instant');
  publishFanExtent();
  applyScene(0);
  if (bookEl) { void bookEl.offsetWidth; bookEl.classList.remove('is-instant'); }  // flush, no transition
  updateSketchNav();
}

// Delivery opens the book on the first spread (called by the rAF delivery trigger).
function openSketchbook() {
  resetSketchbook();
}

// Close button: dismiss the delivery backdrop and reset the book.
// (Re-opening isn't wired — delivery latches once per session in this prototype.)
const closeBtn = document.querySelector('.close-btn');
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    if (backdropEl) backdropEl.classList.remove('is-visible');
    resetSketchbook();
  });
}

resetSketchbook();  // initial layout + caption

// ── rAF loop ──────────────────────────────────────────────────────────────────
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min(now - lastTime, 50); // cap delta to avoid huge jumps on tab-switch
  lastTime = now;

  // Intro gating: the splash freezes everything; the fly-down runs its own branch.
  if (introState === 'splash')    { requestAnimationFrame(loop); return; }
  if (introState === 'flying-in') { flyDown(now, dt); requestAnimationFrame(loop); return; }

  // — Sparkle emission — continuous, throttled to SPARKLE_INTERVAL ms —
  // Runs every frame at the last known cursor position so sparkles persist
  // even when the cursor is stationary. Stops once the card is delivered.
  if (!deliveryTriggered && now - lastSparkleTime > SPARKLE_INTERVAL) {
    createSparkle(cursorClientX, cursorClientY);
    lastSparkleTime = now;
  }

  // — Fly stork toward cursor at a CONSTANT speed (skipped once delivery is triggered) —
  // Straight-line path, fixed px/sec regardless of how far the cursor is, so a big
  // gap no longer causes a fast lunge. dt-based → frame-rate independent.
  if (!deliveryTriggered) {
    const dx = targetX - storkX;
    const dy = targetY - storkY;
    const dist = Math.hypot(dx, dy);
    const step = STORK_SPEED * dt / 1000;
    if (dist <= step) {
      storkX = targetX;            // close enough — arrive exactly, no overshoot/jitter
      storkY = targetY;
    } else {
      storkX += (dx / dist) * step;
      storkY += (dy / dist) * step;
    }
  }

  // Hard boundary: beak is now at the wrapper origin (0,0).
  // Frame extends: 30px left of beak, 197px right; 91px above beak, 82px below.
  // Clamp so the full sprite stays inside the 1366×768 stage.
  storkX = Math.max(30, Math.min(STAGE_W - 197, storkX));
  storkY = Math.max(91, Math.min(STAGE_H - 82,  storkY));

  // — Delivery trigger: latch when stork beak reaches the door area —
  // DOOR_CENTER_Y is the door's y in unscaled stage coords. The scene is scaled
  // around (DOOR_X, DOOR_Y) so the door's apparent y shifts with the zoom:
  //   apparent = DOOR_Y + (DOOR_CENTER_Y - DOOR_Y) * scale
  // Use targetSceneScale (the settled zoom for the stork's current distance), NOT
  // currentSceneScale: the latter lags behind via the 0.06 lerp, so during the
  // descent it reads low and pushes the computed door-centre down the screen —
  // which made the trigger fire at the door's BOTTOM instead of its body.
  const apparentDoorY = DOOR_Y + (DOOR_CENTER_Y - DOOR_Y) * targetSceneScale;
  if (!deliveryTriggered &&
      Math.hypot(storkX - DOOR_X, storkY - apparentDoorY) < DELIVERY_ZONE_PX) {
    deliveryTriggered = true;
    document.body.classList.add('is-delivered');
    if (backdropEl) backdropEl.classList.add('is-visible');
    openSketchbook();   // reveal the flip book on the first spread
  }

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

  if (!deliveryTriggered) {
  // — Scene zoom: map the STORK's distance to the door → scale —
  // Driven by the stork (not the cursor) so the zoom only advances as fast as the
  // stork actually flies — no sudden zoom when the cursor jumps near the door.
    const dist       = Math.hypot(storkX - DOOR_X, storkY - DOOR_Y);
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
  }

  // — Window scene: distance-driven binder + time-driven entrance (frozen on delivery) —
  if (!deliveryTriggered) {
  // Distance from the STORK to the house box (0 when the stork is over the house).
  // Stork-driven (not cursor) so the blind/people react to the stork's real position.
  const houseDX   = Math.max(HOUSE_BOX.x0 - storkX, 0, storkX - HOUSE_BOX.x1);
  const houseDY   = Math.max(HOUSE_BOX.y0 - storkY, 0, storkY - HOUSE_BOX.y1);
  const houseDist = Math.hypot(houseDX, houseDY);

  // Binders: distance-driven, reversible. Open only when the stork is genuinely close
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

  // Entrance: time-based one-shot, independent of distance once triggered.
  // Hysteresis: latch ON inside TRIGGER_IN, latch OFF outside TRIGGER_OUT.
  if (houseDist < ENTRANCE_TRIGGER_IN)  entranceOn = true;
  if (houseDist > ENTRANCE_TRIGGER_OUT) entranceOn = false;
  if (entranceOn) {
    // Play forward at a fixed rate (dt-based) — same speed regardless of stork motion.
    entranceProgress = Math.min(1, entranceProgress + dt / ENTRANCE_DURATION);
  } else {
    entranceProgress = 0; // snap hidden the instant the stork leaves the house area
  }

  // All three animate together off entranceProgress: people jump (overshoot), deco/image slide.
  const peopleP = reducedMotion ? smoothstep(entranceProgress) : easeOutBack(entranceProgress);
  const sideP   = smoothstep(entranceProgress);
  if (peopleEl)     peopleEl.setAttribute('transform',     `translate(0,${PEOPLE_HIDE_Y * (1 - peopleP)})`);
  if (decoEl)       decoEl.setAttribute('transform',       `translate(${DECO_HIDE_X * (1 - sideP)},0)`);
  if (imageEl)      imageEl.setAttribute('transform',      `translate(${-IMAGE_HIDE_X * (1 - sideP)},0)`);
  if (image35851El) image35851El.setAttribute('transform', `translate(${-IMAGE_HIDE_X * (1 - sideP)},0)`);
  } // end !deliveryTriggered window-scene block

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
