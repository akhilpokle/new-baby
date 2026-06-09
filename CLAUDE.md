# Welcome, Baby — Prototype

Front-end-only clickable prototype for DBS intranet new-parent experience.
Vanilla HTML/CSS/JS, no frameworks, no build step. Handed off to Liferay developers.

> **Start every session:** read this file, then read the `docs/` files relevant
> to your task before planning anything.

---

## Docs index

| File | What it covers |
|---|---|
| `docs/architecture.md` | Stage coordinates, z-index stack, CSS→JS token bridge, file map |
| `docs/animation.md` | Stork follow, scene zoom, binder, clouds, cursor, speech bubble, door pulse |
| `docs/gotchas.md` | Known footguns — **read before touching any animation or layout code** |

---

## Stack & constraints

- Vanilla HTML / CSS / JS only. No frameworks, no build step, no npm runtime deps.
- Runs by double-clicking `index.html` or via a plain static server.
- Responsive 1024 px and up only. No mobile / tablet breakpoints.
- Browser target: latest Chrome, Edge, Safari, Firefox. No IE.
- Accessibility: semantic HTML, alt text, visible focus states, WCAG AA contrast, keyboard nav.

## Visual direction

- All colors / spacing / type → `assets/css/tokens.css` as CSS custom properties (DLS swap-ready).
- Single source of truth: every magic number belongs in `tokens.css`.
- Default font: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

## Code style

- Indent: tabs. Class names: kebab-case BEM-ish (`.card`, `.card__title`, `.card--featured`).
- `data-*` attributes for JS behavior hooks — not classes.
- One stylesheet per concern (`tokens.css`, `styles.css`). Avoid inline styles except for
  prototype-only JS-driven state.
- Comment any non-obvious logic with a one-liner for Liferay devs.

## Liferay handoff

- Keep markup semantic and free of prototype-only wrappers.
- CMS-managed content → `<!-- CMS: description -->` comment around it.
- Backend stubs → `// TODO(api): endpoint + payload description` in `app.js`.
- Avoid clever JS patterns; prefer dumb, readable code.

---

## Workflow — features, screens, changes, refactors

Follow this three-phase loop for **every** code change. Do not skip phases.

### Phase 1 — Plan

Break the request into clear, ordered steps. Call out: values that belong in
`tokens.css`, opportunities to reuse existing components, responsive gaps,
missing CMS / API stub comments. List assumptions and any clarifying questions.

### Phase 2 — Review

Present the plan before writing a single line. Wait for explicit confirmation
("go", "execute", "approved"). **Silence is not consent.**

### Phase 3 — Execute

One step at a time. After each step: (1) summarize files touched and key
decisions, (2) state what's next, (3) pause — unless back-to-back execution
was pre-approved.

**DO NOT WRITE OR MODIFY CODE before Phase 2 is confirmed.**

Loop skipped for: pure questions, file reads, typo fixes at a specific pointed-at line,
`[no-loop]` prefix.

---

## Bug-fix workflow

### Debug

Identify file and component. Classify: visual issue (CSS / layout) or functional (JS logic)?
List ranked causes with specific line refs. Propose a fix targeting the root cause, not
the symptom.

### Review

Show diagnosis and fix before touching code. Ask if unclear: browser? expected vs actual?
viewport width? Steps to reproduce?

### Execute

Fix this bug only. No drive-by refactors or "improvements" to nearby code. If you spot
something else, mention it after the fix and ask. After: confirm the bug is resolved,
name what you checked for regressions.

**DO NOT WRITE OR MODIFY CODE before Review is confirmed.**

---

## Out of scope

- Backend, auth, real data
- Mobile / tablet layouts
- Build tooling, bundlers, CSS preprocessors
- Analytics, tracking, cookie banners
- Animations beyond simple CSS transitions (ask before adding)

---

## Repository

- GitHub: <https://github.com/akhilpokle/new-baby>
- Live preview: <https://akhilpokle.github.io/new-baby/>
