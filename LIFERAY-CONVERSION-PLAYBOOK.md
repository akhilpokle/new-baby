# Playbook — converting a React/Figma design into a Liferay-embeddable experience

A reusable guide for any project where a designed React component (typically a
Figma export) has to become plain HTML/CSS/JS and live inside the Liferay intranet.

Written from a completed conversion. Everything in **§7 Gotchas** is something that
actually broke and cost time — read that section before you start, not after.

---

## 0. Three questions to settle before writing any code

Getting these wrong means rework, not refactoring. Ask the business owner, not the
designer.

**1. Where does it live?**

| Answer | What it means technically |
| ------ | ------------------------- |
| **Its own page / route** | Easiest. Full-viewport `position: fixed` chrome is fine as-is. Global CSS is fine. |
| **Full-screen overlay on top of the intranet** | The component is a modal: own scroll container, body scroll lock, focus trap, close button, high `z-index`. All CSS must be scoped. |
| **Inline block inside a shared page** | Hardest. `fixed` → `absolute`, window scroll → container scroll or `IntersectionObserver`, and the block must not disturb host layout. |

"It sits on the intranet page" is ambiguous — it can mean overlay *or* inline.
Ask explicitly: **"when it's dismissed, what does the user see?"** If the answer is
"the intranet underneath", it's an overlay.

**2. Who sees it, and how often?** Gating and once-per-user logic are almost never in
the design. Decide who owns them early.

**3. Where do the interactive bits go?** Designs ship with buttons that have no
destination. Collect the URLs and endpoints before handover, not during.

---

## 1. Namespacing — non-negotiable

The component shares a document with an entire CMS theme. Assume collisions.

- **Prefix every class** with a project token: `<prefix>_card`, `<prefix>_panel-row`.
- **Prefix every `id`**, including generated ones. IDs are the *worse* risk: a
  duplicate makes `getElementById` return the host's element and the script fails
  silently.
- **Prefix every SVG `id`** — `filter`, `clipPath`, gradients. `url(#…)` resolves
  **document-wide**, so a collision renders the wrong filter with no error.
- **Scope every CSS rule** under a single root class:
  `.<prefix>_root .thing { … }`.

Element selectors (`*`, `p`, `img`, `a`, `main`, `button`) **cannot** be namespaced.
Scope them under the root instead:

```css
/* NO — reformats the whole intranet */
*, *::before, *::after { box-sizing: border-box; }
p { margin: 0; }
img { display: block; }

/* YES */
.prefix_root *, .prefix_root *::before, .prefix_root *::after { box-sizing: border-box; }
.prefix_root p { margin: 0; }
.prefix_root img { display: block; }
```

`html` and `body` rules can't be scoped at all — drop them and fold their intent
into the root class.

> **Scoping protects the host from you, not you from the host.** Theme rules like
> `.container p {…}` or `#content button {…}` still reach inside your component.
> Always test against the real theme, never only against your own preview.

---

## 2. Converting Figma-exported JSX

Figma exports are enormous (one illustration here was ~700 nested `<div>`s with
Tailwind arbitrary values). **Do not hand-transcribe them.** Write a small
throwaway converter instead — it is faster and far less error-prone.

A converter needs to:

1. Parse the JSX (these files are very regular — a ~200-line tokenizer is enough).
2. Inline the no-prop sub-components into one another.
3. Resolve the Tailwind subset used into inline `style` attributes. Enumerate the
   classes first (`grep 'className="'`) — it's usually 30–60 distinct tokens, and
   an unhandled one should **throw**, not pass through silently.
4. Substitute `svgPaths.pXXXX` references with the real `d` strings.
5. Namespace generated `clipPath` / `filter` ids.
6. Map React attribute names to HTML/SVG (`strokeWidth` → `stroke-width`,
   `className` → `class`, keep `viewBox` and `preserveAspectRatio` camel).
7. Drop Figma layer-name `id` and `data-name` attributes — they're duplicated
   hundreds of times.

Keep the converter. The generated output is not maintainable by hand, so whoever
inherits the project needs the tool to change anything structural.

**Container-query units** (`cqw`/`cqh`) and CSS `hypot()` appear in newer Figma
exports and have thin browser support. Resolve them to pixels at build time —
you know the parent box sizes statically.

---

## 3. Packaging for Liferay

A Liferay fragment has three separate fields: **HTML**, **CSS**, **JavaScript**.
Ship three files matching them, plus assets.

**Generate all three from one source file.** Keep a single editable
`template.html` containing `<style>`, markup and `<script>`, and have the build
carve it into three outputs. This is the only way the fields can't drift apart.

```
handover/
├── README.md                 the one instruction file
├── preview.html              open-this-to-see-it harness (NOT shipped)
├── <name>.html               → fragment HTML field
├── <name>.css                → fragment CSS field
├── <name>.js                 → fragment JavaScript field
└── assets/                   images
```

**Asset paths.** Ship relative paths (`assets/x.png`) and tell the integrator to
repoint them — in a fragment that's usually `[resources:x.png]`.

**Fonts.** Google Fonts is normally the only external dependency. Flag it: a strict
CSP will block it and it'll need self-hosting. If your layout measures text,
re-measure on `document.fonts.ready`.

**Size.** Inlined SVG path data gets big (~350 KB here). It gzips to ~20%, but
confirm the JS field has no size limit.

---

## 4. Build a hostile preview harness

Ship a `preview.html` that fakes the host page — and make it *deliberately hostile*
so leaks are visible rather than theoretical:

- a different font family (serif is obvious)
- unscoped `p { margin: 0 0 18px }` and `img { border: 4px solid }`
- its own `<main id="main">` and `.container`, to catch id/selector collisions
- enough filler content to be scrollable
- a button to re-open the experience

Then assert the host's computed styles are **unchanged** while your component is
mounted. This turns "should be fine" into a measurement.

---

## 5. Verify by measuring, not eyeballing

Screenshots prove appearance; they don't prove behaviour. Drive a real browser and
assert numbers:

- computed styles on host elements (leak detection)
- `scrollHeight - clientHeight` (scroll range / dead scroll)
- element counts after re-initialising (double-init bugs)
- `document.activeElement` (focus management)
- `aria-selected` / `tabindex` across a tab set
- console errors — assert **zero**

Headless Chrome may report `prefers-reduced-motion: reduce` by default, which
silently disables animation and makes tests pass for the wrong reason. Force the
value explicitly when testing motion.

---

## 6. What the integrator always has to finish

Designs never include these. List them explicitly in the README:

- [ ] Destination URLs for every CTA
- [ ] Real user data (names, dates) replacing placeholder copy
- [ ] Who sees it / how often (gating, once-per-user persistence)
- [ ] Analytics events
- [ ] Close / dismiss behaviour
- [ ] Asset paths repointed to CMS resources

**Make CTAs data-driven.** Give each one an `href` field defaulting to `null`, and
render `<a target="_blank" rel="noopener noreferrer">` when set, an inert `<button>`
when not. The integrator fills in a value; no markup surgery, and the link is
accessible by default.

---

## 7. Gotchas that actually cost us time

**CSS**

- `white-space: pre-wrap` on a *container* renders your HTML source indentation as
  blank lines. JSX strips inter-element whitespace; HTML does not. Put it on the
  text elements.
- `width: 700px; max-width: 100%` inside an auto-width flex item **will not shrink** —
  the constraint is circular. Give the wrapper `width: 100%`.
- `position: sticky` breaks silently under *any* ancestor with `overflow: hidden`
  or `auto`. Put the overflow on the sticky element itself, or on the scroll
  container, never in between.
- `position: sticky` **always creates a stacking context**. You cannot sandwich
  other content between two sticky layers by z-index.
- `position: fixed` resolves against the nearest ancestor with a `transform`,
  `filter` or `perspective` — not the viewport. CMS themes have these. If your
  chrome must cover the window, **reparent the root to `<body>` on init**.
- `backdrop-filter` needs the `-webkit-` prefix for Safari.
- At most one `<main>` per document. Use a `<div>`.

**JS / DOM**

- **Elements measure `0` while hidden.** If the component can start hidden, measure
  on open, not on init.
- **Fragment JS can run twice** (page edit mode, SPA nav). Make init idempotent with
  a marker attribute on the root; tear down the *previous* instance only when the
  node is genuinely new. Getting this backwards deletes the only working instance.
- **`body.style.overflow` scroll locks contend** with any other modal manager.
  Save and restore the previous value.
- **iOS Safari body scroll lock is unreliable.** `overscroll-behavior: contain`
  helps; test on a real device.
- A `transitionend` listener left attached after you cancel an animation will fire
  on the *next* one. Remove it in the cancel path.

**Scroll-driven animation**

- Check where the animation is actually *finished* versus where you stop scrubbing
  it. Ours travelled 2–4× further than needed, so 56% of the scroll was dead.
  Compute when the last element leaves the viewport and end the interaction there.
- Ease-in-out decelerates to zero, so the last element always creeps off screen.
  For scroll-scrubbed motion, **linear is usually right** — the user's scroll
  already supplies the pacing.

---

## 8. Overlay checklist (if that's the chosen shape)

- [ ] `position: fixed; inset: 0` with its own `overflow-y: auto`
- [ ] Progress driven by `root.scrollTop`, **not** `window.scrollY`
- [ ] `overscroll-behavior: contain` to stop scroll chaining
- [ ] Body scroll locked while open, restored on close
- [ ] `role="dialog"`, `aria-modal="true"`, labelled by a heading
- [ ] Focus moves in on open, is trapped, and returns on close
- [ ] Esc closes it
- [ ] Public API — `open()`, `close()`, `isOpen()`, `destroy()`
- [ ] Open/close events dispatched for analytics
- [ ] Opt-out attribute for auto-open, so the host controls timing
- [ ] `prefers-reduced-motion: reduce` honoured

---

## Appendix — integration task list template

Copy into a ticket. Replace `<name>` and `<prefix>`.

> **Setup**
> 1. Open `preview.html` to see what you're building. Don't ship this file.
> 2. Create a Liferay fragment. Paste `<name>.html` → HTML field, `.css` → CSS field, `.js` → JavaScript field. The JS self-initialises.
> 3. Upload the images from `assets/`, repoint the `<img src>` paths (usually `[resources:…]`). Compress them first.
>
> **Content — before launch**
> 4. Fill in the CTA `href` values in the `PANELS` array in the JS field.
> 5. Replace placeholder copy with real user data from Liferay's user context.
> 6. Implement gating so it shows once per user — hook the close event.
> 7. Wire analytics on the interactive controls.
>
> **Verify**
> 8. Test against the **real theme**, not just `preview.html`.
> 9. Test on iOS Safari.
> 10. Run the checklist in README §7.
>
> **Don't**
> - Don't ship `preview.html`.
> - Don't strip the `<prefix>_` naming — it's what prevents collisions.
> - Don't hand-edit generated SVG path data. Text, colours, spacing and links are fine.
> - Don't remove the "reparent to `<body>`" line.
>
> **Ask us for** any structural change (different illustration, new panel, layout
> change) — those come from the generator project, not the shipped files.
