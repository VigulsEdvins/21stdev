# Contributing a component

The full workflow is in [AGENT_GUIDE.md](AGENT_GUIDE.md) (section 2). This page is the short version and the checklist for a pull request.

## Steps

1. `npm run new-feature -- my-slug --category "Heroes" --title "My Hero"` scaffolds `features/my-slug/` with a valid `meta.json`.
2. Fill in `index.html`, `style.css`, `script.js` (standalone, no hot-linked images; media goes in `assets/library/`).
3. Use the design tokens (`var(--bg)`, `var(--text)`, `var(--accent)`, `var(--radius)`, `var(--font-display)`, `var(--font-body)`) so themes and page fonts apply. If the colours really are the design (artwork, print paper, a brand page), set `"palette": "designed"` and a `paletteNote` in `meta.json` saying why.
4. Set `mood`, `industry` and `weight` honestly (they drive the builder's filters), and list `customizable` fields for anything a client should edit.
5. `npm run sync`, `npm run thumbs -- --slug my-slug`, `npm run sync` again.

## Checklist before you open the pull request

- [ ] `npm run verify` passes (schema, registry, stamped bundles)
- [ ] `npm run check-features -- --slug my-slug` is clean (no console errors, not blank)
- [ ] `npm run check-fields -- --slug my-slug` and `npm run check-exports -- --slug my-slug` pass
- [ ] Looks right in the dark, light and warm themes (`npm run audit-themes -- --slug my-slug` reports no low-contrast text)
- [ ] Keyboard operable, and respects `prefers-reduced-motion`
- [ ] Works at 375 px and 768 px (`npm run check-responsive -- --slug my-slug`)
- [ ] `npm test` and `npm run test:e2e` still pass; a new behaviour has a test in `tests/e2e/`
- [ ] Commit messages start with `feat:`, `fix:`, `perf:`, `test:`, `docs:` or `chore:`

CI runs the checks on the components a pull request changes and a full run every night.

## Licences

Do not copy code or art from sites whose licence you have not read. A component is `own` (written here), `MIT`, or used with the author's written permission; record which in `origin` in `meta.json`.
