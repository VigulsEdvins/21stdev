# Security checks

Run everything that can run on your machine:

```bash
npm run security
```

| Check | Command | What it does | If it fails |
|---|---|---|---|
| Secrets in files | `npm run check-secrets` | Looks for keys, tokens and private keys in tracked files (values are never printed in full) | Delete the value, rotate the key, commit the fix. A real false positive goes in `.secrets-allow.json` with a reason and an expiry date |
| Secrets in history | `npm run check-secrets -- --history` | Same scan over every commit's added lines | Rotate the key; history rewriting is a separate decision |
| Dependencies | `npm run audit` | `npm audit` for production dependencies, fails at high and critical | Update the package, or replace it |
| Code safety | `npm run check-code-safety` | No `eval`, `new Function`, `document.write`, unlisted remote scripts, `message` listeners without an origin check (in `features/`) | Remove the pattern, or add `safetyReviewed` with a reason to that feature's `meta.json` |
| Response headers | `npm run check-headers` (file) or `npm run check-headers -- https://staging.edvlabs.com` (live) | `site/_headers` has a strict Content Security Policy (no inline or eval scripts), HSTS, nosniff, referrer, permissions and opener policies; `tests/e2e/csp.e2e.js` loads every public page under that policy | Fix the header file; never loosen `script-src` to make a page work, change the page |

Before every commit (once per clone):

```bash
npm run setup-hooks
```

This runs the secret scan on the staged files and refuses a commit that adds a secret.

CI runs the same checks in the `security` job on every pull request and nightly. Installs use the committed lock file (`npm ci`).

The full plan for security work, with what is still to do, is epic E16 in `docs/superpowers/plans/2026-10-27-edvlabs-storefront-plan.md`.

## HTML-string sites (plan E16.5)

`npm run check-innerhtml` lists every `innerHTML =`, `outerHTML =` and `insertAdjacentHTML` in the builder and catalogue code (`npm run check-innerhtml -- --list` shows all of them). A site passes when it only clears an element, assigns a constant, or wraps every dynamic part in `escapeHtml`. Anything else needs an entry in `docs/security/innerhtml-verdicts.json` with a verdict (`safe`, `fixed` or `waived`) and a reason, so a new risky site cannot slip in. First full review: 2026-10-28, 64 sites, 8 fixed (see the file). Still to do from E16.5: the preview-frame decision and a hostile-input test file.

## postMessage and local storage (plan E16.5, reviewed 2026-10-28)

`npm run check-code-safety` now also scans the project's own code (`builder.js`, `scripts/`, `site/js/`, `functions/`). Two message rules: a `message` listener must check `event.origin` or `event.source`, and `postMessage(..., '*')` needs a `postmessage-ok: <reason>` comment on that line. `eval` and `new Function` in own code fail unless listed with a reason in `OWN_WAIVERS` (two entries: the CSP generator's search pattern, and the React export's component starter).

| Handler | Verdict |
|---|---|
| `assembler.js` preview documents, `UPDATE_THEME` (two listeners) | **Fixed.** Accepted any window; now only `window.parent`, and every colour is checked against a strict pattern before it reaches a style property. |
| `stack-list.js`, `SECTION_CLICKED` | **Fixed.** Accepted any window; now only the preview frame's own window. |
| `cms.js` and `admin.js` | Already checked `event.source`. Their sends used `'*'`; now the page's own origin (only a page with an opaque origin, such as `file://`, still uses `'*'`). |
| `assembler.js` and `preview.js` sends to the preview or the builder | Kept as `'*'` with a written reason: the preview's origin can be opaque, and the payload is only theme colours or a section id. |

Local storage: every key and what reads it was listed. Settings keys (`web_builder_mode`, `web_builder_editor`, `web_builder_ui_theme`, tour, dismissed offer) hold only fixed words and are compared, never inserted. The brief (`edvlabs.brief_v1`) is checked with the shared brief checker before the builder uses it. **Fixed:** the automatic save that the builder reloads on start was applied as it was found; it now goes through the same cleaning as an imported project (`javascript:` links, odd ids), tested by `tests/e2e/saved-state-clean.e2e.js`. Projects and snapshots were already cleaned on import.
