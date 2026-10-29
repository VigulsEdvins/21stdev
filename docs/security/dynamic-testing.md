# Dynamic testing (plan E16.8)

## What runs on its own

| What | How | When |
|---|---|---|
| Fuzzing of the lead endpoint, the brief checker and the project import with oversized, malformed and unicode-heavy input | `npm run test:fuzz` (seeded: `SEED=123 RUNS=2000 npm run test:fuzz` replays or widens a run) | Every `npm test`, so every pull request and the nightly CI run |
| Error answers do not leak a stack, a path, a setting name's value or SQL | `tests/test-fuzz.js` (every answer is scanned) and R09 in `tests/test-security-regression.js` | Same |
| OWASP ZAP baseline scan of staging (passive) | `.github/workflows/zap-baseline.yml` | Nightly, **only once the repository variable `STAGING_URL` exists** (owner step) |

## Owner steps

1. Create the staging site (a second Cloudflare deployment, for example staging.edvlabs.com) and set the repository variable `STAGING_URL`.
2. Read the first ZAP issue. For every false positive add a line to `.zap/rules.tsv` (`<rule id><TAB>IGNORE<TAB><name>`) and a line below saying why.
3. After accounts and checkout exist (Phase 2): add an authenticated scan of the dashboard and the owner area, and the Stripe test-mode checks with failing and repeated events (E8.3, E8.7).

## Findings log

Reports go in `docs/security/reports/` (one file per scan, dated). Each finding is a task in the plan; no unresolved high finding may remain at launch (E16.14).

| Date | Tool | Result |
|---|---|---|
| 2026-10-29 | `tests/test-fuzz.js`, seeds 20261029, 1, 7, 99, 12345, 400 runs each | No crash, no 5xx for bad input, no leak, no line break in a mail subject, no prototype pollution. 0 findings |
| 2026-10-29 | `scripts/check-builder-csp.js` | Builder page clean under the strict policy; preview frame is the one open item (`docs/security/builder-csp.md`) |

False positives recorded: none yet.
