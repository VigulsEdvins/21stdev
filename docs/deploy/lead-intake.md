# Lead intake: what to set up (owner steps)

The code is done and tested (`npm run test:lead`). Switching it on needs three things in your own accounts. Nothing below goes into git.

1. **Resend** (email service): create an account, verify the domain edvlabs.com (it shows DNS records to add in Cloudflare), create an API key.
2. **Cloudflare Pages settings** (Settings, Variables and Secrets), as secrets:
   - `RESEND_API_KEY`: the key from step 1
   - `LEAD_TO_EMAIL`: the address that should receive leads
   - `LEAD_FROM_EMAIL`: a sender on the verified domain, for example one starting `leads@`
3. **Optional, recommended:** a KV namespace bound as `LEADS` (limits one address to 5 sends an hour and marks a repeat visitor as "Again"), and Cloudflare Turnstile with the secret in `TURNSTILE_SECRET`.
4. The pages already carry `<meta name="lead-endpoint" content="/api/lead">` (start and contact). Without the three settings in step 2 the receiver answers "Sending is not set up yet" and the page says the message could not be sent; with them, leads arrive by email.

Test: submit the questions on staging with your own phone number. The email should arrive within a minute, with the contact in the subject.

The Turnstile widget itself is not on the contact form yet: when you create the site key, ask for it to be added.

## What Cloudflare publishes

`wrangler.jsonc` at the repository root tells Cloudflare to publish only `site/` (the public pages, `_headers`, `404.html`). Without it Cloudflare picked the whole repository and the deploy failed with "Asset too large" on a file in `node_modules`. The Worker name in that file (`21stdev`) must match the Worker's name in the Cloudflare dashboard; if the build says the names differ, change one to match the other. `src/worker.js` is the small Worker in front of the site: only `/api/*` reaches it first (`run_worker_first`), every other request is served straight from `site/` with the headers in `site/_headers`. It uses the same code as the Pages Function in `functions/api/lead.js` (`functions/lib/lead-http.js`, tested by `npm run test:leadhttp`). Add the three settings under the Worker's Settings, Variables and Secrets. Without the optional KV binding `LEADS` the limit of 5 sends an hour per address and the repeat marking do not apply.

