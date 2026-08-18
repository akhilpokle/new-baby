# Welcome, Baby — Liferay fragment handoff

Everything in this folder is generated from the working prototype by
`scripts/build-final.mjs` (repo root) — **don't hand-edit `welcome-baby.html`,
`.css`, or `.js`**. If something needs to change, change it in the prototype
(`index.html` / `assets/`) and rerun the build.

Full technical background — fan geometry, content pipeline, known footguns —
lives in the prototype repo's `HANDOFF.md` and `docs/`. This file is only the
integration steps.

## Setup

1. Open `preview.html` to see what you're building. It fakes a hostile host
   page around the fragment (different font, unscoped resets) so any styling
   leak is visible. **It must be served over http(s), not double-clicked** —
   run `serve.bat` from the repo root, then open
   `http://localhost:3000/final/preview.html`. Don't ship this file.
2. Create a Liferay fragment. Paste `welcome-baby.html` → HTML field,
   `.css` → CSS field, `.js` → JavaScript field. The JS self-initialises on
   load and is safe to run twice (page-edit re-saves, SPA re-renders) — it
   no-ops on a second run against the same DOM node.
3. Upload the 17 images in `assets/img/` and repoint every `<img src="assets/img/…">`
   path (usually to `[resources:…]`). Compress further if your CMS has a budget.

## Fonts

The prototype loads **Google Fonts** (`Public Sans`) via a `<link>` in
`index.html` — that link is **not** part of the fragment HTML field, so it
isn't in `welcome-baby.html`. Either add the same `<link>` to the page's
`<head>`, or self-host the font — a strict CSP will block the Google Fonts
request either way. Without it, text falls back to the system UI font
(`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` — still readable,
just not on-brand).

## Content — before launch

4. Employee **name** and **gender** come from Workday, not the query string —
   see `TODO(api)` at the top of `welcome-baby.js`. The `|Employee Name|`
   token currently renders as `"Toast"`.
5. **7 of 9 letter links have no real destination yet** — see the table in
   `HANDOFF.md` §5 "Links need destinations." They render inert (not
   clickable) rather than as broken links; confirm whether Liferay resolves
   the `linkText` template references, or get real URLs.
6. **Submit Claim**'s URL is missing its protocol in the source JSON — the JS
   patches it at render (`normaliseUrl()`), but fix the source too.
7. TLDR page copy and the closing page are still content-team placeholders in
   places — see "Content questions for the content team" in `HANDOFF.md` §5.
8. Wire up the vote buttons (👍/👎 in the chrome row) to actually record
   feedback — see `TODO(api)` near `openBookDirect` / the feedback markup in
   `welcome-baby.js`. Currently cosmetic only.

## Public API

```js
window.WelcomeBabyExperience.open();    // trigger the letter directly, skipping the stork flight
window.WelcomeBabyExperience.close();   // dismiss, same as the close button
window.WelcomeBabyExperience.isOpen();  // boolean
window.WelcomeBabyExperience.destroy(); // removes the fragment's DOM; see note below
```

`destroy()` removes the DOM and the two listeners this file names (keydown,
resize). It does **not** remove the mousemove/wheel listeners, which stay
anonymous, and it doesn't stop the animation loop. Fine for a one-shot
experience; don't rely on it for a page that repeatedly creates/destroys this
fragment without a full reload.

## Verify

9. Test against the **real theme**, not just `preview.html` — the harness
   catches obvious leaks, not everything.
10. Test on iOS Safari — `overscroll-behavior: contain` is set on the dialog,
    but body-scroll locking is flakier there than elsewhere; the code saves
    and restores `document.body.style.overflow` rather than hard-resetting it,
    so it should coexist with another modal manager if the page has one.
11. Keyboard-test the open dialog: Tab should cycle only through controls on
    the visible spread and wrap at both ends; Esc closes; focus returns to
    whatever triggered `open()`.
12. Desktop only, 1024px floor — no mobile/tablet layout exists. Confirm no
    horizontal overflow at 1024px.

## Don't

- Don't ship `preview.html`.
- Don't strip the `wb_` prefix on classes/ids, or move `.wb_root`'s CSS
  custom properties back onto `:root` — see "Namespacing" in
  `LIFERAY-CONVERSION-PLAYBOOK.md` §1 for why (short version: this fragment
  shares a document with the whole Liferay theme).
- Don't hand-edit `welcome-baby.html/.css/.js` — edit the prototype and
  rebuild.

**Ask us for** any structural change (new section, different illustration,
layout change) — those come from the prototype repo, not the shipped files.
