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

Before every commit (once per clone):

```bash
npm run setup-hooks
```

This runs the secret scan on the staged files and refuses a commit that adds a secret.

CI runs the same checks in the `security` job on every pull request and nightly. Installs use the committed lock file (`npm ci`).

The full plan for security work, with what is still to do, is epic E16 in `docs/superpowers/plans/2026-10-27-edvlabs-storefront-plan.md`.
