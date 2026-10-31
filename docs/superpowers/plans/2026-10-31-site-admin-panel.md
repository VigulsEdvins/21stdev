# Admin panel for a published site (plan, 2026-10-31)

Status: **approved 2026-10-31 with the recommended answers to A to D; built and tested locally, not deployed.** Follows `2026-10-30-publish-subdomain.md` and `2026-10-30-account-limits.md`. Open questions are at the end, each with my recommendation.

## Goal (owner request, 2026-10-31)

A customer whose page is live at `<name>.edvlabs.com` can add an **admin panel** (the content editor) to it:

- the customer sets a **username and a strong password** for it;
- the panel lives at **`/admin<10 digits>`** (for example `/admin4827105936`), the digits chosen at random by the server, so the address cannot be guessed;
- the **account page always shows both links** for each site: the website and, when it is on, the admin panel.

## Why this needs real work (what exists today)

- The editor (`scripts/cms/admin.html`, `admin.js`, `cms.js`) has **no login at all**: its own text says anyone who opens it can edit in their own browser, and "only the uploaded file changes the live site" (`cms-content.js`). That is fine for a ZIP the customer hosts themselves, and not for a live address.
- Published sites are static files in R2 served by the sites Worker, which reads only KV and R2 (never the database), and **published sites do not include the editor** (`collectFiles({ cms: false })`).
- So for a live site three things are new: a login checked **on the server** (anything checked in the browser can be skipped by reading the page), a way for the editor to **save to the live site** without the customer uploading a file, and the account page showing the links.

## Security design (layers, because a secret address alone is not security)

An address leaks through browser history, screenshots, a forwarded message or a shared screen. So the 10 digits are only the first layer.

1. **Secret address.** `/admin` + 10 random digits (`crypto.getRandomValues`, not derived from the site id or name). Any other path that starts with `/admin` is an ordinary 404, identical to a page that does not exist, so nothing confirms an admin exists. A "New secret address" button in the account changes the digits if they leak.
2. **Username and password, checked by the sites Worker.**
   - Password rules are the account page's (`site/js/password.js`: 10 to 72 characters, lower case, capital, number, symbol, no common patterns), asked twice. The Worker **checks them again**; the browser is not trusted. Username: 4 to 32 characters, letters, digits, `.` `_` `-`, not equal to the password.
   - Only a **salted hash** is stored (PBKDF2-SHA256 through the Worker's built-in crypto; Cloudflare limits the number of rounds, I will use the highest allowed and measure the CPU time; the Workers Paid plan the publishing plan already assumes covers it). The password is never stored, logged, put in a web address, or sent back.
   - Wrong username and wrong password give the **same answer** and take the same time.
3. **Slow down guessing.** After 5 wrong tries in 15 minutes for a site (and per visitor address) the login refuses for 15 minutes. KV counters are approximate across the world (up to about a minute); together with the slow hash and the secret address that is enough for a launch. A Durable Object would make it exact; noted as a later step, not needed now.
4. **Session = a signed cookie, not a KV record.** KV is eventually consistent, so a session written in one place may not exist yet in another. Instead the Worker signs `{site id, expiry, credential version}` with a new secret `ADMIN_SESSION_SECRET` (owner step). Cookie: `__Host-edv_admin`, `Secure; HttpOnly; SameSite=Strict; Path=/`, **no `Domain`** (the `__Host-` prefix forces that), 8 hours. This keeps the rule from the publishing plan: never a cookie for `.edvlabs.com`, so one customer's site cannot see another's. Changing the password or username bumps the credential version, which ends every open session.
5. **Writes are protected from other sites.** Every save checks the cookie, an `Origin` that equals the site's own address, and a JSON content type. `SameSite=Strict` already stops cross-site posts; the Origin check is the second lock.
6. **The panel's own pages** answer `Cache-Control: no-store`, `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer` (so the address is not sent on when a link is followed), and the same strict script policy as the rest of the platform. No public file (pages, `sitemap.xml`, `robots.txt`) may mention `/admin<digits>`; a publish-time check refuses a site that does.
7. **Saved content is checked as strongly as publishing.** The save endpoint accepts only the JSON the editor produces, within a size cap, through the same sanitising the builder uses on import (`project-sanitize.js`, the editor's import check): only known field ids, links that are not `javascript:`, plain text. Nothing a logged-in admin sends can add a script to the public page.
8. **The editor's own files** (`admin.html/css/js`, `cms.js`) are never accepted as uploaded files: the Worker serves them only from the trusted bundle the builder code produces, in the same spirit as the script allow-list (`2026-10-30-script-allowlist.md`). A customer cannot replace the admin code with their own.

## How it works

```
Customer, signed in at /account/      edvlabs Worker (existing)              Storage
  "Add admin panel", username, password ──▶ POST /api/site-admin ──▶  Supabase: site_admins (hash, digits)
                                             checks sign-in, owner,   KV: admin:<name> → {id, digits, user, hash, version}
                                             strength, paid place     R2: the editor files, in a private folder

Customer opens  <name>.edvlabs.com/admin4827105936
  ─▶ sites Worker: KV says digits match? ─ no → normal 404
                                          └ yes → login page (no cookie) / editor (valid cookie)
  Save in the editor ─▶ POST /admin…/save ─▶ checks cookie + Origin + content ─▶ R2: content for this site
                                            the public page picks it up within about a minute
```

### Where edits are kept

Today `cms-content.js` holds both the **structure** (sections and fields, made from the page at export) and the **published values** (the customer's edits). On a live site:

- the structure stays part of the published version, as now;
- the customer's values are stored **separately** (`sites/<site-id>/content.json`) and the sites Worker answers `/cms-content.js` as structure plus these values. A new publish from the builder replaces the structure and **keeps the stored values** for every field id that still exists; the builder tells the customer about values that no longer match anything (see question C).
- Rollback of a version therefore never loses the customer's edits, and nothing mutable lives inside a version folder.
- Public cache for `cms-content.js` is short (60 seconds) so an edit shows quickly.

### Database (new migration, **not applied until you say so**)

`public.site_admins`: `site_id` (primary key, references `published_sites`, deleted with it), `path_digits` (10 digits, unique), `username`, `password_hash`, `salt`, `rounds`, `credential_version`, `created_at`, `changed_at`, `last_login_at`. Row-level security as for the other publishing tables: the owner may read **only** `site_id`, `path_digits`, `username`, `last_login_at` (column-level grant; the hash is never readable from the browser), and nobody can write from the browser. Only the server's key writes, as for `published_sites`. The hourly clean-up also removes the KV record of a site that is deleted or taken offline.

### Server pieces

- `functions/lib/site-admin.js` (new): rules, hashing, `enable`, `change` (password, username, new digits), `remove`, `adminStatus` for the account. Plain-words error messages like `publish.js`. Tested with the fake Supabase/KV/R2 classes.
- `POST /api/site-admin` (enable, change, remove) in `publish-http.js`; `my-sites` returns each site's admin digits and username to its owner.
- `functions/lib/sites-serve.js`: before normal file lookup, handle `/admin<10 digits>…` (login page, login, logout, editor files, save) and `/cms-content.js`. Everything else is unchanged.
- Publishing: the editor bundle is stored once per site in the private folder when the admin is enabled (and refreshed on every publish, so it matches the builder's version); `collectFiles` stays without the editor.

### Account page (`site/account/`, `site/js/account-extras.js`)

For each published site, always visible:

- **Website:** `https://<name>.edvlabs.com/` with Open and Copy.
- **Admin panel:** when on, `https://<name>.edvlabs.com/admin4827105936` with Open and Copy, the username, last sign-in, and buttons **Change password**, **Change username**, **New secret address**, **Remove admin panel**. When off: **Add admin panel** (username, password twice, strength bar, Show/Hide). Taken offline: the admin link is shown greyed with "Site is offline".
- Because the account page needs a sign-in, the secret address is never shown to anyone else.
- If the customer forgets the admin password, they sign in to their edvlabs account and set a new one there; no email flow needed (question D).

The builder's "Put it online" step gets one line after publishing: "Want to edit your texts later? Add an admin panel in your account."

## What stays true

- Downloading the ZIP and self-hosting works as today (the editor in the ZIP still has no login and says so; the self-hosting guide keeps its advice).
- Public pages are still static files; visitors never touch the database or the login code.
- No cookie ever has `Domain=edvlabs.com`; `check-headers` gets a check that the admin cookie is host-only.
- One admin user per site in this first version.

## Build order (each step small, tested, committed locally)

1. Rules and hashing (`site-admin.js`): username, password, 10 random digits, hash/verify, credential version. Unit tests including hostile input and timing-equal answers.
2. Migration `…_site_admins.sql` with the column grants, plus RLS tests against the pretend Supabase (the owner cannot read the hash, nobody writes). **Not applied to the real project until you say so**; apply to a branch first.
3. Store and endpoints: enable, change, remove, status; `my-sites` extended. Refusals change nothing.
4. Sites Worker: `/admin<digits>` routing, login with limits, signed cookie, Origin check, wrong path = 404. Tests run the real Worker code with fake bindings.
5. Editor for a live site: serve the bundle from the private folder; Save button in the editor posts to `…/save` when it runs on a live admin address; content stored separately and merged into `/cms-content.js`; keep values on republish.
6. Account page: the links, add/change/remove, strength bar, messages.
7. Local demo (`npm run dev:demo-publish`) learns the admin too, so the whole flow can be tried on `http://<name>.localhost:4173/admin…`; browser test in `tests/e2e/`: add admin, log in, wrong password locks, edit a text, save, a visitor sees it, republish keeps it, change password ends the session, removed admin is a 404.
8. Docs: `docs/deploy/publish-sites.md` gets the owner steps; entry in `docs/HANDOFF.md`.

## What you (the owner) will have to do

1. Add the secret `ADMIN_SESSION_SECRET` to the sites Worker (a long random value; I will give the command that makes one). Never in git or in chat.
2. Approve applying the new migration (first to a Supabase branch).
3. Confirm the Workers Paid plan (the slow password hash needs more CPU time than the free plan gives).

## Open questions (my recommendation first)

- **A. Price.** Included with a paid site for now, with the switch for a separate price ready (same idea as `account_limits`), or sold as an extra? *Recommend: included for now.*
- **B. When an edit goes live.** Save is live at once (within about a minute), or the customer first sees a draft and presses Publish? *Recommend: live on Save, with the editor's existing Undo and a "Back to the previous saved version" button.*
- **C. Republish from the builder.** Keep the customer's admin edits (merged by field), or let the builder's wording win? *Recommend: keep the edits, and warn about fields that no longer exist.*
- **D. Forgotten password.** Reset from the signed-in account page (no email), or also a "forgot" link on the admin login? *Recommend: account page only; a login-page reset would be one more way in.*

## Not included

- More than one admin user per site, roles, two-step sign-in (a good later add-on).
- Custom domains (the same code would work once the Worker looks up the host).
- A history of who changed what.

## As built (2026-10-31)

Owner approved the plan with the recommended answers: A included with a paid site, B live on Save, C republish keeps the edits, D reset only from the account page.

Files: `functions/lib/site-admin.js` (rules, hash, signed session, account actions, `cleanStructure`), `functions/lib/site-admin-serve.js` (everything under `/admin<digits>` and the two files live pages load), `supabase/migrations/20261031100000_site_admins.sql`, `site/js/site-admin-account.js` (account page), changes in `sites-serve.js`, `publish.js` (`adminHook`, `adminStructure`), `publish-http.js` (`/api/site-admin`, `my-sites` carries each site's admin), `sites-store.js`, `scripts/cms/admin.js` (live mode), `scripts/builder/export-zip.js` (`cms: 'live'`), `guided-publish.js`, `publish-client.js`, `scripts/demo-publish.js`, `scripts/dev-site.js`.

Differences from the plan above, and why:

- **The sites Worker has no database key.** The plan had it update "last sign-in" in the database. It now writes that time to KV (`adminlast:<site id>`), and the main Worker reads it for the account page. The sites Worker's only secret is `ADMIN_SESSION_SECRET`. It now also **writes** to R2 (the customer's saved edits), which it did not before; the R2 binding is read-write already, nothing to change.
- **Referrer policy is `same-origin`, not `no-referrer`.** With `no-referrer` Chrome sends `Origin: null` on a form post, which the Origin check refuses (found by the browser test: the login form was rejected). `same-origin` still sends nothing to other sites.
- **Where edits live:** `sites/<id>/admin/content.json` (and `content.prev.json`, one step back, used by "Go back to the previous saved version"); the field list is `sites/<id>/admin/structure.json`, made from the builder's export and rebuilt from known keys on the server (`cleanStructure`), never taken as sent. The public file `/cms-content.js` is made by the Worker from both; pages carry `<script src="cms-content.js">` and `<script src="cms.js">` tags, and the Worker answers those two paths itself, **only** for a site with an admin panel. They are not part of the uploaded files, so the script allow-list is unchanged.
- **Removing the panel removes its edits** (the page goes back to how the builder made it); the account page says so before the button is pressed.
- **Read access for the browser:** column-level `select` on the non-secret columns only (not the hash, salt, rounds or version). The account page does not use it (the Worker gives the data), so it is the narrowest that still satisfies the row-level-security test (R12, extended to check this).
- **A site that already has an admin panel needs a new publish from the builder to have anything to edit.** The builder (Update with this page) sends the field list automatically for such a site; the account page says so right after the panel is added.

Not done, on purpose: exact (Durable Object) counting of wrong passwords (KV counters are approximate across the world), several admin users, two-step sign-in, a live-site check of headers after the first deploy (do `npm run check-headers` against a real site once deployed).

Tests: `npm run test:siteadmin` (22 groups: rules, hash, session, actions, serving, lock-out, Origin check, save checks, restore, no secret address in public files), `test-publish-http.js`, `test-sites-worker.js`, R12 in `test-security-regression.js`, and the real-browser flow `tests/e2e/site-admin.e2e.js`.
