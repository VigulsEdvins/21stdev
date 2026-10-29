# Send to GitHub: owner steps and what is built (plan E7.6)

## Built and tested (against a pretend GitHub, `tests/lib/fake-github.js`)

- `functions/lib/github-push.js`: one commit through the Git Data API, never a force push, a clash list before overwriting, an empty repository handled, plain results for a removed install or deleted repository. Files in the repository equal the ZIP byte for byte (checked by comparing Git blob ids).
- `functions/lib/github-app.js`: the app's signed token (RS256) and a one-hour installation token asking only for "Contents: write" and "Metadata: read". Nothing is stored; error messages never echo a token.
- `functions/lib/send-to-github.js`: refuses an unpaid, over-allowance or expired page before any GitHub call, rate limit, audit event per push. `functions/lib/entitlement.js` holds the paid rules (D7a).
- `npm run test:githubpush`.

## Not built yet (needs the owner or a server-side project store)

1. **Register the GitHub App** in your GitHub account (Settings, Developer settings, GitHub Apps): permissions "Contents: Read and write" and "Metadata: Read-only", nothing else; no webhook needed. Download the private key. Convert it to PKCS#8: `openssl pkcs8 -topk8 -nocrypt -in key.pem -out key-pkcs8.pem`.
2. Put `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (PKCS#8, newlines as `\n`) and `GITHUB_APP_SLUG` in the Worker's environment settings. They never go in git.
3. **Open point: "make a new private repo for me".** A GitHub App installation token with only Contents access **cannot create a repository** on a person's account. Options: (a) the buyer creates an empty repository first (we show the three clicks) and picks it; (b) the app also asks for "Administration: write" and acts with the buyer's own user token; (c) a "Use this template" link to a template repository. Decide before the button is built; (a) keeps the permission list as small as the plan says.
4. The HTTP route, the "Send to GitHub" button in the Get it panel and the dashboard, the install and repository chooser, and storing only the installation id and repository name per page. These need the server-side projects (E7.1 cloud save exists; the server-side file build is E7.4 or a server check of the files).
5. GitHub named as a processor in the privacy text (E12).
