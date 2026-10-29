# Lead intake: what to set up (owner steps)

The code is done and tested (`npm run test:lead`). Switching it on needs three things in your own accounts. Nothing below goes into git.

1. **Resend** (email service): create an account, verify the domain edvlabs.com (it shows DNS records to add in Cloudflare), create an API key.
2. **Cloudflare Pages settings** (Settings, Variables and Secrets), as secrets:
   - `RESEND_API_KEY`: the key from step 1
   - `LEAD_TO_EMAIL`: the address that should receive leads
   - `LEAD_FROM_EMAIL`: a sender on the verified domain, for example one starting `leads@`
3. **Two protections, both in the code already (2026-10-29), recommended before launch:**
   - **Rate limit and "Again" marking (storage `LEADS`).** `wrangler.jsonc` declares the binding with no ID, so the next `wrangler deploy` creates the KV namespace in your account and links it (needs **wrangler 4.45.0 or newer**; check with `wrangler --version`, update with `npm i -g wrangler`). Nothing to type. It limits one address to 5 sends an hour and marks a repeat visitor as "Again". If your deploys come from GitHub instead, the namespace is still created; its ID is then only visible in the Cloudflare dashboard (Workers KV).
   - **Spam check (Cloudflare Turnstile) on the contact page and the start questions.** Cloudflare dashboard → **Turnstile → Add widget**, hostnames `edvlabs.com` (and `localhost` for local tests), mode Managed. It gives a **site key** (public) and a **secret key** (private). Then in the Worker's **Variables and Secrets**: `TURNSTILE_SITE_KEY` = the site key (plain variable) and `TURNSTILE_SECRET` = the secret key (secret). **Set both together**: with only the secret the receiver answers 503 "The spam check is only half set up" and names `TURNSTILE_SITE_KEY`. The same widget and site key also serve the account page (see `accounts.md`, which also needs the secret in Supabase). With both set, the two pages show the check, wait for it, and the Worker refuses a message without a passed check.
4. The pages already carry `<meta name="lead-endpoint" content="/api/lead">` (start and contact). Without the three settings in step 2 the receiver answers "Sending is not set up yet" and the page says the message could not be sent; with them, leads arrive by email.

Test: submit the questions on staging with your own phone number. The email should arrive within a minute, with the contact in the subject.

First real test after deploy (the widget and the storage are tested here only with stand-ins): open the contact page, check the widget appears and passes, send one message, then send six in a row from the same connection and see the sixth refused ("Too many tries"). `https://edvlabs.com/api/form-check` should answer `{"turnstileSiteKey":"…"}` (and `{}` before the keys are set).

## What Cloudflare publishes

`wrangler.jsonc` at the repository root tells Cloudflare to publish only `site/` (the public pages, `_headers`, `404.html`). Without it Cloudflare picked the whole repository and the deploy failed with "Asset too large" on a file in `node_modules`. The Worker name in that file (`21stdev`) must match the Worker's name in the Cloudflare dashboard; if the build says the names differ, change one to match the other. `src/worker.js` is the small Worker in front of the site: only `/api/*` reaches it first (`run_worker_first`), every other request is served straight from `site/` with the headers in `site/_headers`. It uses the same code as the Pages Function in `functions/api/lead.js` (`functions/lib/lead-http.js`, tested by `npm run test:leadhttp`). Add the three settings under the Worker's Settings, Variables and Secrets. Without the optional KV binding `LEADS` the limit of 5 sends an hour per address and the repeat marking do not apply.

If sending does not work, open `https://edvlabs.com/api/lead` is not useful (POST only); instead run `curl -X POST -H 'Content-Type: application/json' -d '{}' https://edvlabs.com/api/lead`. A `503` with `"missing": [...]` lists the settings the running Worker cannot see (see `docs/deploy/accounts.md`, last section, for the usual causes); a `422` means the settings are all there.
