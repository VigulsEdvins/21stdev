# Accounts: sign-in with Google, GitHub, email (owner steps and how it works)

The pages and code are built and tested against a pretend Supabase (`tests/lib/fake-supabase.js`). Making it real needs the settings below, all in the owner's own dashboards. Nothing here goes into git.

## Settings

**Supabase (Authentication)**
- Providers: **Google** and **GitHub** enabled with their client IDs and secrets (the secrets live only in Supabase). Callback address for both: `https://<project-ref>.supabase.co/auth/v1/callback`.
- **URL Configuration:** Site URL `https://edvlabs.com`; Redirect URLs `https://edvlabs.com/**` (and the staging address, and `http://localhost:4173/**` for local testing).
- **Email:** keep "Confirm email" on. Supabase links accounts that share a verified email.
- Emails (confirmation, sign-in link, password reset) are sent by Supabase's built-in sender at first, which is rate limited and meant for testing. Before launch set **custom SMTP** in Supabase using the verified Resend domain, and edit the email templates in plain words.

**Cloudflare: the Worker's own Settings → Variables and Secrets** (the runtime ones, NOT the "Build" section, whose variables are only for the build step and never reach the running Worker). Plain variables:
- `SUPABASE_URL`: the project address, for example `https://<project-ref>.supabase.co`
- `SUPABASE_ANON_KEY`: the public key (labelled anon or publishable). Both are public by design.
- **Never** put the service_role (secret) key in the site or in chat. It belongs only in Cloudflare as a secret when a server step needs it.

**Google:** consent screen set to "In production" (while it says Testing only listed test users can sign in), authorized domains `edvlabs.com` and the full project domain `<project-ref>.supabase.co` (Google refuses the bare `supabase.co`), the OAuth client's redirect URI as above. Add the privacy-policy and terms links to Branding when those pages exist.

## How it works

- `site/account/index.html` and `site/js/account.js` are the page; `site/js/auth.js` talks to Supabase over `fetch`, with no third-party library.
- The page asks `/api/config` (the Worker, `functions/lib/lead-http.js`) for the Supabase address and the public key, so neither is in git. Without them the page says accounts are not open yet.
- Google, GitHub, emailed links and password reset use **PKCE**: the browser keeps a random verifier in `sessionStorage`, sends only its SHA-256 hash, and swaps the one-time `?code=` it comes back with for a session. The code is removed from the address bar at once and works only once, only in the browser that asked. No token ever travels in a web address.
- The session (access and refresh tokens) is kept in `localStorage` so a visit survives a reload. The page never trusts the stored copy: every load asks Supabase who the token belongs to, and a refused token ends the session. Risk and mitigation: anything that could run a script on the page could read the tokens, so the account page has the same strict policy as the rest of the site (no inline scripts, `script-src 'self'`), plus one allowed connection, the Supabase address, in `site/_headers` (`/account/*`, with the `!` line that removes the general policy first; `npm run check-headers` verifies it).
- Errors are shown in plain words under the box they are about. Wrong-password and unknown-address answers do not reveal which accounts exist ("forgot password" answers the same either way).

## Not built yet

- Nothing links to the account page from the menu yet (it is reachable at `/account/`, and marked noindex). Add the link when the builder needs an account.
- Accounts do not own anything yet: projects, orders and downloads (plan E4, E7, E10) and the database rules that keep each customer's rows private (E4.1).
- Delete account and change email (plan E4.2, E12.5).
- Cloudflare Turnstile on sign-up, and the terms and privacy text to agree to (E12).

## Tests

`npm run test:auth` (the library against the pretend service), `tests/e2e/account.e2e.js` (the page end to end, including Google and GitHub redirects, a replayed link and password reset), and `tests/e2e/csp.e2e.js` (the page under its own policy with zero violations).

## If the page says "Accounts are not open yet"

Open `https://edvlabs.com/api/config` in a browser. It answers with the names of the settings the running Worker cannot see, for example `{"missing":["SUPABASE_URL","SUPABASE_ANON_KEY"]}` (the same works for `/api/lead`, which lists the lead settings). The usual causes: the variables were added under Build instead of the Worker's Variables and Secrets; a name has a typo or a stray space; or a deploy removed plain variables (`wrangler.jsonc` now has `keep_vars: true` to prevent that; adding them as **Secrets** also makes them survive). After changing variables, redeploy and reload. Browsers keep styles and scripts only until they check with the server (`site/_headers`), so a stale page after a deploy fixes itself on reload.

## Test it on your own computer

```bash
cp .dev.vars.example .dev.vars      # then open .dev.vars and fill in the values (git ignores this file)
npm run dev:site                    # http://localhost:4173/  (PORT=... to change)
```

`scripts/dev-site.js` serves `site/` with the headers from `site/_headers` (so a policy mistake shows up here, not only live) and answers `/api/config` and `/api/lead` with the same code as the live Worker. It prints which settings it found. Open `http://localhost:4173/account/` to try Google, GitHub and email sign-in for real.

- Supabase must allow the address: Authentication → URL Configuration → Redirect URLs must include `http://localhost:4173/**` (and the port you use, if you change it).
- Google and GitHub need nothing extra: their callback goes to Supabase, which then returns to localhost.
- Fill the three lead settings only if you want the contact form to send a real email from your computer. Leave them empty to see how the form behaves unconfigured.
- `.dev.vars` is never committed. Do not paste its contents into chat.
- Tests that need no real accounts: `npm run test:auth` and `node tests/e2e/account.e2e.js` use the pretend Supabase.

