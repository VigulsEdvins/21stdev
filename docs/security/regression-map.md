# Security regression map (plan E16.6)

`npm run test:security` (also part of `npm test`, so CI runs it) runs `tests/test-security-regression.js`. Each protection has a named test. A trial mutation (turning the protection off) was run for R02 to R04, R06, R07, R12 to R14 on 2026-10-29 and each made its own test fail; R05 is guarded twice (the HTTP layer and the lead handler both refuse a big body), so turning off one layer does not fail it.

| Item of E16.6 | Test | Where the protection lives |
|---|---|---|
| Price tampering | R01 | `functions/lib/lead.js` (`quote`, `parse`) |
| Email header injection | R02 | `functions/lib/lead.js` (`clean`) |
| Spam through the honeypot | R03 | `functions/lib/lead.js` (`handle`) |
| Rate limits (contact and brief forms) | R04 | `functions/lib/lead.js` (`handle`) |
| Oversized input | R05 | `functions/lib/lead-http.js`, `functions/lib/lead.js` |
| Wrong content type | R06 | `functions/lib/lead-http.js` |
| CSRF on state-changing requests | R07 | `functions/lib/lead-http.js` (Origin check) |
| Mass assignment | R08 | `functions/lib/lead.js` (`parse` builds the lead from named fields) |
| Errors leak little | R09 | `functions/lib/lead-http.js` |
| Headers on API answers | R10 | `functions/lib/lead-http.js` (`json`) |
| Only public settings leave the server | R11 | `functions/lib/lead-http.js` (`route`) |
| IDOR, reading rows when signed out | R12 | `supabase/migrations/*.sql` (row level security, owner policies, no `anon` rights) |
| Download without payment, after expiry, above the allowance | R13 | `functions/lib/entitlement.js` |
| Unpaid push to GitHub, path escape, token leak, force push | R14, R15 | `functions/lib/send-to-github.js`, `github-push.js`, `github-app.js` |
| Secrets in the downloaded files | R16 | `scripts/assembler.js` |
| Hostile project import and hostile content | `tests/test-hostile-input.js` (existing) | `scripts/project-sanitize.js`, `scripts/assembler.js` |
| Path traversal on the local server | `tests/test-dev-site.js` (existing) | `scripts/dev-site.js` |
| Headers on static files | `npm run check-headers`, `tests/e2e/csp.e2e.js` (existing) | `site/_headers` |

## Not testable yet, because the thing to protect does not exist

Each gets its test in the task that builds it (the plan task is in brackets).

- Webhook with a wrong signature, replayed webhook [E8.3]
- Open redirect in the payment success address [E8.2]
- Owner-only pages opened by a customer [E10 owner area]
- Upload of a disallowed type or an oversized file [E7 uploads, if added]
- Download link after refund and after expiry (signed links) [E7.3, E8.5]
- Rate limits on sign-in: done by the auth service (Supabase) and Turnstile; check its settings, not our code [E4.2]
- Review-comment files: covered by `test-hostile-input.js` for the import path
