# Lead intake: what to set up (owner steps)

The code is done and tested (`npm run test:lead`). Switching it on needs three things in your own accounts. Nothing below goes into git.

1. **Resend** (email service): create an account, verify the domain edvlabs.com (it shows DNS records to add in Cloudflare), create an API key.
2. **Cloudflare Pages settings** (Settings, Variables and Secrets), as secrets:
   - `RESEND_API_KEY`: the key from step 1
   - `LEAD_TO_EMAIL`: the address that should receive leads
   - `LEAD_FROM_EMAIL`: a sender on the verified domain, for example one starting `leads@`
3. **Optional, recommended:** a KV namespace bound as `LEADS` (limits one address to 5 sends an hour and marks a repeat visitor as "Again"), and Cloudflare Turnstile with the secret in `TURNSTILE_SECRET`.
4. In `site/start/index.html` add `<meta name="lead-endpoint" content="/api/lead">` inside `<head>`. Until then the page keeps answers in the browser and says nothing was sent.

Test: submit the questions on staging with your own phone number. The email should arrive within a minute, with the contact in the subject.

The Turnstile widget itself is not on the contact form yet: when you create the site key, ask for it to be added.
