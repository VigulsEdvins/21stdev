# Storefront forms: the two missing protections

Owner request 2026-10-29. Applies to edvlabs.com's own forms (contact page, start page questions), which post to `/api/lead` (`functions/lib/lead-http.js`). Not the builder's exported sites.

## What is missing today (from `docs/HANDOFF.md`)

1. **Rate limit and "again" marking** need a KV binding called `LEADS`. The code already uses it when present (`handle()` in `functions/lib/lead.js`: 5 sends an hour per address, repeat marking), but `wrangler.jsonc` has no binding, so none of it applies.
2. **Turnstile spam check** is verified by the Worker when `TURNSTILE_SECRET` is set (`turnstileOk()`), but the contact and start pages show no widget and send no token. Turning the secret on today would reject every message.

## What I will do, and what for

| Change | Why |
|---|---|
| `wrangler.jsonc`: `"kv_namespaces": [{ "binding": "LEADS" }]` with no ID | Wrangler 4.45+ creates the namespace on the next deploy and links it (Cloudflare docs, "Automatic provisioning"). No manual ID, nothing created in your account by me. |
| New `GET /api/form-check` in the Worker, answering `{ turnstileSiteKey }` (the public site key, or nothing) | The static pages need the public key without a build step; `/api/config` needs Supabase settings, which the contact page does not. |
| Worker refuses with a clear 503 when `TURNSTILE_SECRET` is set but `TURNSTILE_SITE_KEY` is not | Half a setup would silently reject every visitor; this names what to add instead. |
| New `site/js/spam-check.js`: loads Cloudflare's script and shows the widget only when a site key exists | One shared piece for both pages; without a key nothing changes for visitors. |
| `contact.js` and `start.js` wait for the check, send its token as `turnstile`, reset it after a refusal | The Worker already reads `body.turnstile`. |
| `site/_headers`: `/contact/*` and `/start/*` allow `https://challenges.cloudflare.com` for `script-src` and `frame-src` only; `scripts/check-headers.js` enforces it | Same narrow exception the account page already has; nothing else loosened. |
| Tests: Worker (key endpoint, half-setup 503, token required/accepted/refused, rate limit with a stand-in store), browser (widget shown only with a key, token sent, refused token resets), headers check | Proof without touching the real Cloudflare. |
| `docs/deploy/lead-intake.md`: the owner steps | Creating the Turnstile widget and adding its two keys are done in your Cloudflare dashboard; I cannot and will not do that. |

## What stays true

- Nothing is switched on until you add `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET` (the same widget can serve the account page).
- The real Cloudflare widget and the KV storage are untested live; the first real message after deploy is the test.
- Needs Wrangler 4.45.0 or newer for the automatic KV creation (older versions reject a binding with no ID).
