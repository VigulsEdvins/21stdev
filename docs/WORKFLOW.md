# How we work on edvlabs

Written 2026-10-28. This is the one page to read before changing anything. It says how a change travels from an idea to edvlabs.com, what protects the live site on the way, and where each kind of change is recorded. Detail lives in the documents it links to; this page does not repeat them.

## The shape

```
your computer  ->  branch + pull request  ->  main  ->  Cloudflare  ->  edvlabs.com
 (npm run dev:site)   (CI must pass)        (the only branch)  (builds dist/, deploys)
```

- **`main` is production.** Cloudflare builds and deploys every push to `main`. Nothing is pushed to `main` without a green pull request.
- **What gets published is `dist/`**, not the repository. `npm run build:site` ([scripts/build-site.js](../scripts/build-site.js)) copies `site/` and the builder into it. `dist/` is git-ignored and rebuilt every time.
- **Secrets never enter git.** They live in the Cloudflare dashboard and in Supabase; locally in `.dev.vars` (git-ignored, checked by the pre-commit hook).

## One-time setup the owner must do (until done, the live deploy is at risk)

1. **Cloudflare build command.** In the Cloudflare project (Workers & Pages, the project that deploys this repository): Settings, Build, set **Build command** to `npm run build:site` (deploy command stays `npx wrangler deploy`). `wrangler.jsonc` publishes `./dist`, which does not exist until that command runs. **Until this is set, do not push to `main`.**
2. **GitHub branch protection** on `main` (Settings, Branches): require a pull request and the CI checks to pass before merging; no direct pushes.
3. **Preview builds for pull requests** (Cloudflare, Settings, Build, branch control): turn on builds for non-production branches, so every pull request gets its own address to look at before it is merged. Cloudflare variables must also exist for previews if the preview should sign in.
4. Run `npm run setup-hooks` once on every computer that commits (blocks a commit that contains a secret).

## The loop for any change

1. **Branch from an up-to-date `main`:** `git switch main && git pull && git switch -c feat/short-name`. Prefixes: `feat/`, `fix/`, `docs/`, `chore/`.
2. **Work locally.** `npm run dev:site` builds `dist/` and serves the site with the real headers, the Worker's API and your `.dev.vars` at http://localhost:4173/ (builder at `/builder/`). It watches the files: a saved change rebuilds `dist/` by itself (a line in the terminal says so) and you just reload the page; no restart. Restart it only after changing `.dev.vars` or the server script itself (stop the old one first, or the port is busy).
3. **Test as you go.** The quick set is `npm test`. For browser behaviour run the one test that covers it, e.g. `node tests/e2e/languages.e2e.js`. Every new behaviour gets a test; a bug fix gets a test that fails without the fix.
4. **Before opening the pull request:** `npm run ci -- --fast` (verify, unit, end-to-end). Run `npm run security` if you touched headers, sign-in, the builder's scripts or anything that handles visitor input.
5. **Commit small and in the repository's style:** `feat:`, `fix:`, `perf:`, `test:`, `docs:` or `chore:` first, then what changed and why. One theme per commit.
6. **Open a pull request.** CI runs the full checks (`.github/workflows/ci.yml`; every night too). Look at the preview address. Merge when green.
7. **After merging:** Cloudflare deploys. Open the live page you changed and check it once (the "after deploy" list below).
8. **Update [HANDOFF.md](HANDOFF.md)** with what changed and what is still open, in the same pull request. A change nobody can find later did not happen.

## What each check protects

| Check | Command | Protects against |
|-------|---------|------------------|
| Unit and structure tests | `npm test` | broken logic, the staged folder missing a file, the free-blocks list drifting, a weakened `wrangler.jsonc` |
| Browser tests | `npm run test:e2e` | a flow that works on paper but not in a page (sign-in, builder, languages, export) |
| Headers | `npm run check-headers` | a policy change that opens the site up; the builder and account page rules are enforced |
| Security sweep | `npm run security` | secrets, risky code patterns, unreviewed HTML-string sites |
| Components | `npm run verify`, `check-features` | an invalid or blank component; see [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Site speed and accessibility | `npm run check-site-lighthouse` | a public page that got slow or inaccessible |

Rule: if a check is red, the change is not done. Never silence or delete a check to get green; fix the cause, or say in the pull request why the check is wrong and change the check on purpose.

## Changes that need extra care

**Database (Supabase).** Never change tables by hand in the dashboard. Write a file in `supabase/migrations/<timestamp>_name.sql`, review it, apply it, then run the project's security advisors and fix what they report. Record it in HANDOFF.md ("applied to the real project on <date>"). Every table has row level security on and policies for the owner only; a table without them is a bug. Applied migrations are never edited; a new migration corrects an old one.

**Headers and sign-in (`site/_headers`, `site/js/auth.js`, `src/worker.js`).** Run `npm run check-headers`. A loosened policy needs a comment saying exactly why and a rule in `scripts/check-headers.js` that pins it, so a later edit cannot widen it silently.

**Components (`features/<slug>/`).** Follow [CONTRIBUTING.md](../CONTRIBUTING.md). Each component has `access` in `meta.json`: `free` means a visitor who is not signed in may use it in the builder; leave it out for "needs a free account". The free list today is every look of each everyday block kind plus the language switcher (`tests/test-access.js` pins it). Changing it is one word in `meta.json`, then `npm run sync`. This is a soft lock in the page (the files are public), meant to invite sign-ups, not to protect paid content; if components are ever sold, the lock must move to the server.

**Prices (`site/js/prices.js`).** One table feeds the home page, the questions, the calculator and the builder. Change it there only.

## After a deploy

1. Open https://edvlabs.com/ and the page you changed, in a private window.
2. If you touched sign-in: sign in with Google, GitHub and an email once. If you touched forms: send one message through the contact page.
3. `npm run check-headers -- https://edvlabs.com` checks the live headers.
4. Something wrong? **Roll back first, investigate second:** in Cloudflare, Deployments, roll back to the last good one (instant), or `git revert <commit>` in a pull request. A database change is rolled back with a new migration, not by deleting data.

## Where things are written down

| What | Where |
|------|-------|
| State of the project, what is done and open, last decisions | [HANDOFF.md](HANDOFF.md) (read first in any new session) |
| What remains before launch, in order | [superpowers/plans/2026-10-28-launch-scope.md](superpowers/plans/2026-10-28-launch-scope.md) |
| Designs and plans for bigger work | `docs/superpowers/specs/` and `plans/`, dated |
| Sign-in and database set-up (owner steps) | [deploy/accounts.md](deploy/accounts.md) |
| Lead email set-up | [deploy/lead-intake.md](deploy/lead-intake.md) |
| Security notes | [security/README.md](security/README.md) |
| Parked ideas and known gaps | [BACKLOG.md](BACKLOG.md) |
| Adding components, agent instructions | [../AGENT_GUIDE.md](../AGENT_GUIDE.md), [../CONTRIBUTING.md](../CONTRIBUTING.md) |

## Rules of thumb

- Small pull requests. If it cannot be explained in three sentences, split it.
- Decisions the owner made go into HANDOFF.md with the date, so they are not asked twice.
- Do not deploy on a Friday evening, and do not deploy something you have not opened in a browser.
- If unsure whether something is safe: do it on a branch and look at the preview; production is not the place to find out.
