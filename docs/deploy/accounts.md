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

## Emailed code, spam check, repeat password (owner steps)

**1. Make the emails show the code.** In Supabase, open **Authentication → Email Templates** and edit three templates so each shows the code and keeps the link. The page asks for the code Supabase puts in `{{ .Token }}`:

- **Confirm signup**, **Magic Link** and **Reset Password** (subject lines in plain words, for example "Your edvlabs code"). Body, for each (change the heading and the last sentence to fit):
```html
<h2>Your edvlabs code</h2>
<p>Type this code on the page: <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
<p>Or press this link on the same device: <a href="{{ .ConfirmationURL }}">Continue</a></p>
<p>If you did not ask for this, you can ignore this email.</p>
```
- In **Authentication → Sign In / Providers → Email** the code length is 8 digits by default (the page accepts 6 to 10 digits, so changing it needs no change here) and it expires after an hour by default. Keep "Confirm email" on.
- Until custom SMTP is set (see above) Supabase's own sender is limited to a few emails an hour, which is enough for testing and not for launch.

**2. Turn on the spam check (Cloudflare Turnstile), optional but recommended before launch.**
1. Cloudflare dashboard → **Turnstile → Add widget**. Hostnames: `edvlabs.com` (and `localhost` for local testing). Mode: Managed. It gives a **site key** (public) and a **secret key** (private).
2. Supabase → **Authentication → Attack Protection** → switch on **CAPTCHA protection**, provider **Cloudflare Turnstile**, paste the **secret key** there (never in git or Cloudflare variables). From then on Supabase itself refuses sign-up, sign-in, emailed code and reset requests that carry no valid spam-check token, even from a bot that skips the page and calls the service directly.
3. Add the **site key** (public) as the plain variable `TURNSTILE_SITE_KEY` in the Worker's Variables and Secrets (and in `.dev.vars` for local testing). The page then shows the check and sends its token. Turn **step 2 on before or together with step 3**: if the page shows the check but Supabase's protection is off, nothing breaks; if Supabase's protection is on but the page has no site key, every sign-in is refused.

**What each defence does.** The *honeypot* (a hidden box on every form; people never see it, bots that fill every box do) catches simple form-filling bots and costs nothing, but a bot that talks to Supabase directly never touches the page, so it cannot be stopped there. Only the *spam check verified by Supabase* stops that. Supabase also rate-limits emails per address and per hour, whatever the page does.

**Password rules.** The page (`site/js/password.js`) requires a new password to have 10 to 72 characters with a lowercase letter, a capital, a number and a symbol, and refuses ones built on a very common word or pattern (`Password123!`). A live bar shows Low, Medium or High: longer is stronger (12 or more reaches High when every kind is used), and repeats, runs like `1234` or `qwer`, and your own email name lower it. Show and Hide buttons let people check what they typed. These checks are only a convenience in the browser: a bot can call Supabase directly, so **set the same rules in Supabase itself**: Authentication → Sign In / Providers → Email → **Minimum password length 10** and **Password requirements: lowercase, uppercase, digits and symbols**. ("Prevent use of leaked passwords", which checks a password against known breaches, is a Supabase Pro plan feature; turn it on when the plan allows.) The 72-character top limit matches what the service keeps of a password.

**Repeat password.** Creating an account and choosing a new password both ask for the password twice and refuse if the two differ, before anything is sent.

## How it works

- `site/account/index.html` and `site/js/account.js` are the page; `site/js/auth.js` talks to Supabase over `fetch`, with no third-party library.
- The page asks `/api/config` (the Worker, `functions/lib/lead-http.js`) for the Supabase address and the public key, so neither is in git. Without them the page says accounts are not open yet.
- Google, GitHub, emailed links and password reset use **PKCE**: the browser keeps a random verifier in `sessionStorage`, sends only its SHA-256 hash, and swaps the one-time `?code=` it comes back with for a session. The code is removed from the address bar at once and works only once, only in the browser that asked. No token ever travels in a web address.
- The session (access and refresh tokens) is kept in `localStorage` so a visit survives a reload. The page never trusts the stored copy: every load asks Supabase who the token belongs to, and a refused token ends the session. Risk and mitigation: anything that could run a script on the page could read the tokens, so the account page has the same strict policy as the rest of the site (no inline scripts, `script-src 'self'`), plus one allowed connection, the Supabase address, in `site/_headers` (`/account/*`, with the `!` line that removes the general policy first; `npm run check-headers` verifies it).
- Errors are shown in plain words under the box they are about. Wrong-password and unknown-address answers do not reveal which accounts exist ("forgot password" answers the same either way).

## Not built yet

- The menu and footer link to the account page ("Sign in" / "Account"). "I will build it" on the questions page sends people to `/account/?from=start` when accounts are on, and after signing in on to `/builder/`.
- The account page lists saved pages, shows the answers, changes the email and deletes the account. The migration `supabase/migrations/20261028180000_projects_and_delete_account.sql` (the `projects` table and the `delete_my_account()` function) was applied to the real project on 2026-10-28. Nothing saves a page into the account yet (plan E7.1); orders and downloads come with checkout (E8, E10.2).
- Delete account and change email (plan E4.2, E12.5).
- The terms and privacy text to agree to when creating an account (E12). Turnstile on the contact and question forms (the lead receiver already supports `TURNSTILE_SECRET`; the widget is not on those forms yet).

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

## Saved answers (the `briefs` table)

The answers from the questions are saved to the account at sign-in so the builder can offer them on any device.

1. Apply `supabase/migrations/20261028150000_briefs.sql` to the project (SQL editor: paste and run; or `supabase db push` from a linked checkout). It creates `public.briefs` with row level security: anonymous visitors have no access, a signed-in person reads and writes only their own row.
2. Check: Table editor -> `briefs` shows "RLS enabled"; Advisors (Security) lists no warning for it.
3. No new Cloudflare variable. The `/account/*` policy already allows the Supabase address; the builder's own policy allows https: addresses.
4. Until the table exists, saving fails quietly: the account page and the builder work as before and the answers stay in the browser.
