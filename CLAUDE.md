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

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
