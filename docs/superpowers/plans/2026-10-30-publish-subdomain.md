# Publish to `<name>.edvlabs.com` (plan, 2026-10-30)

Status: **owner answered the six questions on 2026-10-30 (see "Decisions"); price still open; nothing built.** Approve this file before any code is changed.

## Goal

A customer finishes a page in the builder, chooses a name (for example `bakery-anna`), presses **Publish**, and within seconds the page is live at `https://bakery-anna.edvlabs.com/`. No git, no Cloudflare account and no DNS work for the customer or for the owner per site.

## Why this way (and not one Cloudflare Pages project per site)

- Pages projects are capped (500 per account) and each needs its own repo, build and domain call. Customers would also need git.
- One Worker answering for every subdomain has no cap, nothing to create per site, and "publish" is just "upload files, claim a name".
- Git stays what it is today: our own source code only. Customer sites are never in git.

## How it works (the whole picture)

```
Customer's browser                  edvlabs Worker (existing)          Storage
 builder: Publish  ── files + name ─▶  POST /api/publish  ──────────▶  R2: the files
                                        checks sign-in, name, limits   KV:  name → current version
                                        writes Supabase row            Supabase: who owns the name

Visitor opens bakery-anna.edvlabs.com
   ─▶ Cloudflare (wildcard DNS + wildcard route) ─▶ sites Worker (new)
        reads "bakery-anna" from the address, looks up the version in KV,
        returns the file from R2 with safe headers
```

### Pieces

1. **Wildcard DNS and route (Cloudflare dashboard, owner).** A proxied record for `*` in the `edvlabs.com` zone and a Worker route `*.edvlabs.com/*`. Exact hostnames (`edvlabs.com`, `www`, and any later `app`, `api`) are more specific than the wildcard, so they keep going to the existing site. Cloudflare's free universal certificate already covers one level of wildcard (`name.edvlabs.com`); names with a dot in them (`a.b.edvlabs.com`) are not allowed and not needed.
2. **A second Worker, `src/sites-worker.js` (new).** Serves published sites only. Kept apart from `src/worker.js` so a bug in site serving cannot touch leads, accounts or config. Its own `wrangler` config file with R2 and KV bindings (read-only on R2).
3. **R2 bucket `edvlabs-sites` (new).** Files stored as `sites/<site-id>/<version>/<path>` (a stable id, not the name, so renaming moves nothing). Each publish writes a new version folder; the old one stays for rollback (last 5 versions kept, older ones deleted).
4. **KV namespace `SITES` (new).** One key per name, `site:<name>` → `{version, status}`. Serving reads only KV and R2, never Supabase, so a visitor page load is fast and does not depend on the database being awake. KV is eventually consistent (up to about a minute worldwide); the Publish screen says "live within a minute".
5. **Supabase table `public.published_sites` (new migration, not applied until approved).** `name` (unique, lower-case), `owner_id`, `project_id`, `version`, `status` (`live` / `unpublished` / `blocked`), `created_at`, `published_at`. Row-level security: the owner reads their own rows; writes only through the Worker with the service key, never from the browser. A unique index on `name` is what really guarantees no two people get the same name.
6. **`POST /api/publish`, `GET /api/site-name`, `POST /api/unpublish` in the existing Worker.**
   - `site-name?name=…` answers "free / taken / not allowed" for the live check while typing.
   - `publish` takes the signed-in person's token, the name and the exported files (the same files the ZIP download already produces, built in the browser). It checks: valid token; name rules; name free or already theirs; file list and size limits; allowed file types. It then writes R2, updates KV and the Supabase row, and returns the address.
   - `unpublish` sets status to `unpublished`; the address then shows a plain "this site is not available" page. The name stays reserved for its owner.
7. **Builder screen (step 5 "Get it", `scripts/builder/guided-get.js` plus a new `guided-publish.js`).** Below "Go to the download": a name box (`____.edvlabs.com`), live availability, a **Publish** button, then the live address with a copy button, and **Update** / **Take offline** afterwards. A visitor who is not signed in is sent to `/account/` and back, as the free-block lock already does.

### What the sites Worker returns

- `/` → `index.html`; `/about` → `about.html` or `about/index.html`; the language pages the builder already exports (`index-lv.html`) are plain files. Anything missing → the site's own `404.html` if it has one, else a small edvlabs 404.
- Content types from the file extension; `Cache-Control: public, max-age=300` for pages, longer for hashed assets.
- Security headers on every answer: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`, and a Content-Security-Policy suited to exported pages. The exact policy depends on what the exports contain (inline styles and the library's scripts); I will measure the real exports with the existing `check-headers` / CSP tooling rather than guess.
- Indexed by search engines right away (owner decision 2026-10-30): no `noindex`. Because of this, renaming must leave a permanent redirect behind (see "Renaming").
- Unknown name (no KV key) → 404 with a "this address is free, build a site" link to edvlabs.com.

## Names

- Allowed: lower-case letters, digits and single hyphens; 3 to 30 characters; may not start or end with a hyphen.
- Reserved (cannot be claimed): `www`, `api`, `app`, `admin`, `mail`, `smtp`, `ftp`, `ns1`, `ns2`, `static`, `assets`, `cdn`, `blog`, `shop`, `status`, `support`, `help`, `account`, `login`, `builder`, `edvlabs`, and similar. Also a short list of look-alikes of banks and payment brands, and offensive words. The list lives in one file (`site/js/site-names.js`), shared by the browser check and the Worker, so they cannot disagree (same pattern as `brief.js`).
- Blocked words (owner decision 2026-10-30): names must look like a normal business. Names containing adult, hate, violence or scam words are refused, as a substring check after removing hyphens and turning common look-alikes back into letters (`p0rn`, `s3x`). The list is a plain file in `site/js/site-names.js`, easy to extend, and the owner can still block any live site afterwards. No other names are held back for the owner.
- Names are first come, first served. A name is released only if the owner unpublishes and then deletes it, or when an account is deleted (the existing delete-account migration will be extended).

## Limits (to stop abuse and surprise bills)

- At most 20 MB and 500 files per site; no single file over 5 MB.
- File types allowlist: html, css, js, json, svg, png, jpg, webp, avif, gif, ico, woff2, txt, xml, webmanifest. Everything else is refused.
- Publishes: 10 per hour per account (KV counter, same idea as the lead limit).
- Sites per account: several (owner decision 2026-10-30). Each published site is paid for separately, so the cap is a safety limit only: 10 per account, a setting that can be raised per account.
- R2 and Workers cost: R2 gives 10 GB free, then a few cents per GB; Workers free plan allows 100,000 requests per day across all Workers, so a launch will likely need the **Workers Paid plan (about 5 USD a month)**. I cannot see your billing; please confirm.

## Security points to be aware of

- **Same registrable domain.** Customer sites live on siblings of `edvlabs.com`. Today the sign-in session is in `localStorage`, which is per exact address, so a customer site cannot read it. The rule to keep: **never set a cookie with `Domain=edvlabs.com`** on the main site, and add a check to `check-headers` that fails if it ever happens.
- **No customer-written code.** Published pages are built only from the library's components; the import cleaner drops `html`, `css`, `js`. `docs/HANDOFF.md` says the preview-frame decision must be revisited "the day a customer can paste their own HTML, CSS or script". Publishing raises the stakes of that rule, so the Worker also re-checks every uploaded HTML file server-side (no `javascript:` links, no `<script src>` to other hosts, no `<form action>` to other hosts, the same checks as `check-code-safety`). The browser is not trusted.
- **Known limit of the server check (step 3, `functions/lib/publish.js`).** HTML and SVG are scanned for script addresses, scripts from other sites, frames, forms sending data elsewhere and similar; file names, types, sizes, counts and image signatures are checked. **JavaScript files cannot be judged by a scan.** A person calling the publish endpoint directly (not through the builder) could upload their own script, which would then run on their `<name>.edvlabs.com`. Today this is held back by the paid-place requirement and the owner's block switch. The real fix, to do before opening publishing to everyone: the server accepts only scripts that match the library's known files (a list of their hashes made at build time), or rebuilds the site from the saved project itself instead of trusting uploaded files.
- **Script policy on published pages (step 4).** The sites Worker adds only `frame-ancestors 'none'; object-src 'none'; base-uri 'self'` and the usual headers. Which scripts may run is decided by the policy tag the export already writes into `index.html` (`renderCsp` in `scripts/assembler/export.js`); a header with its own `script-src` would fight it. As far as I read, only `index.html` gets that tag, not the extra language pages (`index-lv.html`). To check in the live test, and if so add the tag to every page at export time.
- **Phishing and abuse.** Anyone with a free account could publish a fake page. Mitigations: a visible, small "Made with edvlabs · Report" bar link is *not* forced, but a report address is on the not-available page; the owner can set a site to `blocked` in Supabase and the next KV update removes it (a small admin script `scripts/block-site.js`, owner-run, needs the service key). A harder gate is requiring payment before publishing (see decisions).
- **Publish token.** The Worker verifies the Supabase JWT itself (signature and expiry) and uses the service key only server-side, as an environment secret. Nothing secret goes in the repo.
- **Forms on published sites.** The contact-form block would need somewhere to send. Not part of this plan; it is a separate piece (see "Not included").

## Build order (each step small, tested, committed locally)

1. `site/js/site-names.js`: name rules and reserved list, with `tests/test-site-names.js`.
2. Supabase migration `…_published_sites.sql` + RLS tests against the pretend Supabase. **Not applied to the real project until you say so.**
3. `functions/lib/publish.js`: validate, store, return address; with fake R2/KV classes for tests (`tests/test-publish.js`): bad token, taken name, reserved name, too many files, forbidden type, hostile HTML, rate limit, update keeps old version, rollback.
4. `src/sites-worker.js` + `wrangler.sites.jsonc`: routing by host, index/404 rules, headers (`tests/test-sites-worker.js` runs the real Worker code with fake bindings).
5b. Account deletion also removes the person's R2 files and KV keys.
5. Wire the three `/api/*` endpoints into `src/worker.js` / `lead-http.js` router.
6. Builder: `guided-publish.js`, name box and live check, states (not signed in, free, taken, publishing, live, updating, offline). Browser tests with the pretend Supabase and a pretend publish API (`tests/e2e/publish.e2e.js`).
7. `npm run dev:site` serves a local fake of the sites Worker so the whole flow can be tried on `http://bakery-anna.localhost:PORT`.
8. `docs/deploy/publish-sites.md`: the exact owner steps (below), and `scripts/block-site.js`.
9. After you do the owner steps and deploy: live check of one real test site, headers check (`check-headers` against `https://test-site.edvlabs.com`), and the Workers Paid plan confirmation.

## What you (the owner) will have to do, because I cannot log in to Cloudflare

1. Cloudflare → DNS: add a proxied wildcard record `*` (AAAA `100::` is the usual placeholder) in the `edvlabs.com` zone.
2. Create the R2 bucket `edvlabs-sites` and the KV namespace `SITES` (wrangler can do both on first deploy; I will give the commands).
3. Add the Worker route `*.edvlabs.com/*` to the new sites Worker (in `wrangler.sites.jsonc`; I will write it).
4. Add secrets: `SUPABASE_SERVICE_KEY` (and confirm `SUPABASE_URL`, `SUPABASE_ANON_KEY` exist) to the main Worker.
5. Approve applying the new Supabase migration.
6. Confirm the Workers plan.

## Not included (separate pieces, to be planned later)

- Customers' own domains (`www.bakery-anna.lv`): needs Cloudflare for SaaS (custom hostnames), about 0.10 USD per hostname per month after the first 100 free. A good paid add-on later; it fits this design because the Worker would look up the host in KV in the same way.
- Payment before publishing (E8) and the download gate.
- Contact forms and other back-end features on published sites.
- Visitor statistics per site.
- Editing a published site from the customer's phone or a content editor on the live address (the existing editor add-on is separate).

## Decisions (owner, 2026-10-30)

1. **Publishing on an `edvlabs.com` address is a paid action.** The customer can always download the files for free or at the normal builder price and host them anywhere; choosing `<name>.edvlabs.com` is the paid extra. Consequences:
   - The price goes in `site/js/prices.js` (the one price table) and is shown in the builder's price meter and on the pricing page. **Amount still to be decided** (a yearly or monthly fee is likely, since hosting is a running cost; this is the owner's choice).
   - `POST /api/publish` refuses unless the account has an active "publishing" entitlement for that site. Payment itself is epic E8 (Stripe), not built yet. Until it exists, an entitlement is a row in a new table `public.site_entitlements` that only the owner can write (service key), so the owner can grant it by hand to test accounts and early customers. When Stripe arrives, its webhook writes the same row; nothing else changes.
   - When the entitlement ends (not renewed), the site goes to status `unpublished` after a grace period (default 14 days, with an email), and the files are kept 90 days so renewing restores it.
2. **Several sites per account**, safety cap 10, each with its own entitlement.
3. **Renaming** is allowed; how hard it is, see below.
4. **Indexed right away**, no noindex.
5. **No "Made with edvlabs" link**: the address already carries the name.
6. **Name filter** for bad words; no names held back for the owner.

## Database as written (step 2, migration `20261030120000_published_sites.sql`)

- `published_sites`: id, owner, name (unique index; format check in SQL too), saved page it came from, live version, status (`live`/`unpublished`/`blocked`), rename dates, timestamps. Safety cap of 10 per account in a trigger.
- `site_name_holds`: a name given up by a rename or unpublish, held 90 days for its owner, with an optional redirect target.
- `site_entitlements`: one row is one paid place for one site (`site_id` empty until used; `paid_until`; `granted_by` is `owner` now, `payment` later). Publishing consumes a free place or uses the site's own.
- All three: owner may read their own rows; **no** insert/update/delete right for the browser; anonymous has nothing. The regression test R12 checks this.
- Deleting an account cascades these rows, but not R2 files or KV keys: the Worker's account-deletion path must also remove them (added to the build order as step 5b).
- The SQL has not been run by a database yet (no local SQL engine here). Apply it first to a Supabase **branch**, not the real project, and only with the owner's go-ahead.

## Renaming (answer to "how hard")

Not hard: about one small endpoint and its tests, roughly one build step of the nine. What it does:

1. `POST /api/site-rename` with the old and new name. Same checks as publishing (signed in, owner of the old name, new name valid, free, not blocked).
2. In one go: Supabase row gets the new name; KV gets `site:<new>` pointing at the current version; the old KV key becomes `{redirect: "<new>"}`; R2 files are not copied or moved (the version folder is looked up by a stable site id, not by the name), so renaming is instant and costs nothing.
3. Visitors to the old address get a permanent `301` redirect to the same path on the new address. Because pages are indexed from day one, this keeps search ranking and every link customers already printed or shared.
4. The old name stays reserved for that owner for 90 days (so it cannot be taken by someone else and used to impersonate the business), then is released and the redirect removed.
5. Limit: 2 renames per site per 30 days, to stop name-hopping and squatting.

The only real cost is that R2 paths use a site id instead of the name (`sites/<site-id>/<version>/<path>`); I have changed the plan's storage layout to that now, so it is no extra work later. Build order gets one added step after the publish screen: "rename endpoint and the Rename button".

## Still open

- The **price** of publishing on an edvlabs address, and whether it is yearly or monthly.
- Whether the grace period (14 days) and file retention (90 days) after non-payment suit you.
