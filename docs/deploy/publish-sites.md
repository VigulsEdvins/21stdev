# Publishing at `<name>.edvlabs.com`: what to set up (owner steps)

The code is done and tested (`npm run test:publish`, `test:sitesworker`, `test:publishhttp`, `test:sitesstore`, `test:publishclient`, `test:ownersites`, and the browser tests `guided-publish` and `demo-publish`). Switching it on needs the steps below in your own accounts. Nothing here goes into git. Plan and reasons: `docs/superpowers/plans/2026-10-30-publish-subdomain.md`.

**Try it first on your computer, with nothing set up:** `npm run dev:demo-publish`, then follow the lines it prints.

## What you are switching on

```
builder "Put it online"  ->  main Worker (/api/publish)  ->  R2 (files) + KV (name -> live version) + Supabase (who owns the name)
visitor at name.edvlabs.com  ->  sites Worker  ->  KV -> R2   (never the database)
```

Two Workers: the main one (`wrangler.jsonc`, already live) and a new, read-only one for the sites (`wrangler.sites.jsonc`). Both must use the **same** KV namespace and R2 bucket.

## Cost (check on your Cloudflare billing page, I cannot see it)

- R2: 10 GB free, then a few cents per GB; no charge for reading out of it.
- Workers: the free plan allows 100,000 requests a day across all your Workers, shared with the main site. Expect to need the **Workers Paid plan (about 5 USD a month)** once real sites get visitors.
- KV: free allowance is generous; the hourly clean-up reads each site once an hour.
- Supabase: three small tables; nothing new to pay for.

## Steps, in this order

### 1. Supabase: the tables

**Done 2026-10-30:** trial run passed on a throwaway project; the new file was then applied to the `edvlabs` project (ref `idvirglyjvqneaudnsuu`), which already had the three earlier files. Only step 4 below (copying the service key) is left from this section. The steps are kept for reference and for any other project.

1. Create a **new empty test project** in Supabase (free) and run `supabase/migrations/` there first, **all files in order**, in the SQL editor. This catches any mistake before it touches your real data. (The new file is `20261030120000_published_sites.sql`; it needs the earlier ones, `projects` in particular.)
2. If it ran without errors, run the same file in the **real** project (SQL editor, or `supabase db push` if you use the CLI).
3. Check in the Table editor: `published_sites`, `site_name_holds`, `site_entitlements` exist, and each shows **RLS enabled**.
4. Copy the project's **service role key** (Project settings → API). It is a secret: it can do anything to the database. It goes only into step 3 below.

### 2. Cloudflare: storage

**Done 2026-10-30:** the KV namespace `SITES` (id `3ec1a308b9914c22ba2cc075f0f3b690`) and the R2 bucket `edvlabs-sites` are created, and both are written into `wrangler.jsonc` (binding names `SITES` and `SITES_BUCKET`) and `wrangler.sites.jsonc`. Careful if you ever run these commands again: when `wrangler` asks "add it on your behalf?", answer **no**; it reformats the file and picks its own binding name (`edvlabs_sites`), which our code does not read.

```bash
npx wrangler kv namespace create SITES
npx wrangler r2 bucket create edvlabs-sites
```

The first command prints an `id`. Put it in **both** files:

- `wrangler.sites.jsonc`: replace `REPLACE_WITH_THE_ID_FROM_wrangler_kv_namespace_create`.
- `wrangler.jsonc` (the main Worker): add next to the existing `LEADS` binding, so the two lines read:

```jsonc
  "kv_namespaces": [{ "binding": "LEADS" }, { "binding": "SITES", "id": "<the id>" }],
  "r2_buckets": [{ "binding": "SITES_BUCKET", "bucket_name": "edvlabs-sites" }],
```

Until both bindings and the key exist, the publishing endpoints answer **503 "Publishing is not set up yet"** and list only the *names* of what is missing; the hourly clean-up does nothing. So deploying the main Worker earlier is safe.

### 3. Cloudflare: the secret

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Paste the service key from step 1. (`SUPABASE_URL` and `SUPABASE_ANON_KEY` are already set for sign-in.) Never put the key in `.dev.vars` on a shared computer, never in the dashboard's plain variables.

### 4. DNS: the wildcard

Cloudflare dashboard → `edvlabs.com` → **DNS** → add record: type `AAAA`, name `*`, content `100::`, **Proxied (orange cloud)**.

- Existing records (`www`, mail records such as Resend's, anything else) stay as they are; a wildcard only answers names that have no record of their own.
- Certificates: Cloudflare's free universal certificate already covers `*.edvlabs.com` (one level deep, which is all this uses).

### 5. `www` and other fixed addresses

The route `*.edvlabs.com/*` in `wrangler.sites.jsonc` catches **every proxied name** under edvlabs.com that has no more specific rule, including names that have their own server. (Grey-cloud "DNS only" names such as the mail records never pass through Workers, so they are safe.)

**Checked 2026-10-30 against the real DNS list:** the only proxied names are the wildcard `*` and the apex `edvlabs.com` (a Worker custom domain, which wins over the wildcard). `rsend` and `send` are Resend's DNS-only mail records, kept out of the site names (reserved in `site/js/site-names.js`). `prompts` was deleted by the owner. So only `www` needs handling: it has no record of its own, the wildcard catches it and it answered `522` until a redirect exists.

- **Make `www` redirect to the main site:** Rules → Redirect Rules → create (or the template "Redirect from WWW to root"): when hostname equals `www.edvlabs.com`, dynamic redirect to `concat("https://edvlabs.com", http.request.uri.path)`, status 301, preserve query string. Redirect rules run before Workers, so this keeps working once the sites Worker is deployed. Check: `curl -sI https://www.edvlabs.com | head -3` shows `301` and `location: https://edvlabs.com/`.
- **If you ever add a website under another proxied name** (for example `app.edvlabs.com` pointing at a server), also add a route `app.edvlabs.com/*` with the Worker set to **None** (Workers & Pages → Workers Routes), and add the name to `RESERVED` in `site/js/site-names.js`. A more specific route with no Worker wins over the wildcard. A name that is a Worker custom domain needs nothing.

### 6. Deploy

```bash
npm run build:site
npm run deploy:site                                # the main Worker (also happens on push if Cloudflare builds from git)
npx wrangler deploy -c wrangler.sites.jsonc        # the sites Worker; this one is not part of the git build, run it yourself
```

### 7. Give yourself a paid place and test with a real site

```bash
npm run owner-sites -- grant you@example.com       # one paid place for one year; needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the shell
```

Then, signed in at `https://edvlabs.com/builder/`: build a small page, step 5 "Get it", **Put it online** with a name like `testsite-anna`, and open `https://testsite-anna.edvlabs.com/`.

Check, and tell me anything that differs:

- [ ] The page looks like the builder's preview, on a computer and on a phone.
- [ ] `curl -sI https://testsite-anna.edvlabs.com/` shows `x-content-type-options: nosniff`, `strict-transport-security`, `referrer-policy`, `permissions-policy`, and `content-security-policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'`.
- [ ] A page that does not exist (`/nope`) shows the 404 page, with status 404.
- [ ] **Languages:** if the test page has an extra language (`index-lv.html`), open it and check it works. Every published page carries the page security policy (publishing forces it on since 2026-10-30), so view the source of the live page and look for `Content-Security-Policy`.
- [ ] **Videos and sounds:** no block of the library uses any (checked), so nothing should be missing. If the builder ever says "Left out: …" after publishing, a file kind the live site cannot hold was dropped; tell me which block caused it.
- [ ] Take it offline from the builder; the address shows "This site is not available". Put it back.
- [ ] Open `https://edvlabs.com/builder/` and the home page again: nothing about the main site changed. (Also the usual first-deploy header check: `npm run check-headers -- https://edvlabs.com` and `node scripts/check-builder-csp.js https://edvlabs.com`.)

## Admin panel for a site (added 2026-10-31)

A customer can add an admin panel to a published site from the account page ("My websites"): a username and a strong password, at the secret address `https://<name>.edvlabs.com/admin<10 digits>`. Plan and design: `docs/superpowers/plans/2026-10-31-site-admin-panel.md`. Included with a paid site; nothing to price yet.

Owner steps, in this order, before the first customer uses it:

1. **Apply the migration** `supabase/migrations/20261031100000_site_admins.sql` (first to a Supabase branch, then the real project, as for the other tables). The customer-facing code only touches the new table when someone adds a panel, so it can be applied just before the deploy.
2. **Make the session secret and set it on the sites Worker** (never in git or in chat):
   ```bash
   openssl rand -base64 48
   ```
   then paste the output when this asks for it:
   ```bash
   npx wrangler secret put ADMIN_SESSION_SECRET -c wrangler.sites.jsonc
   ```
   Without it the admin address answers like any missing page. Changing the secret signs everybody out of every admin panel.
3. **Workers Paid plan.** The password check is deliberately slow (PBKDF2, 100,000 rounds, the most a Worker allows); on the free plan's 10 ms CPU limit a login may be cut off. The publishing plan already assumed the paid plan.
4. **Deploy both Workers** (the main one by git push, the sites one with `npx wrangler deploy -c wrangler.sites.jsonc`).
5. **Check the headers once on a real site with a panel**: `curl -sI https://<name>.edvlabs.com/admin<digits>` should show `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, a `Content-Security-Policy` with `frame-ancestors 'none'`; after signing in the cookie must be `__Host-edv_admin` with `Secure; HttpOnly; SameSite=Strict` and **no `Domain`**.

Everyday: a customer who forgets the admin password sets a new one from their signed-in account page. To switch the feature off, delete the `ADMIN_SESSION_SECRET` secret (`npx wrangler secret delete ADMIN_SESSION_SECRET -c wrangler.sites.jsonc`); the panels stop answering and the public sites are unaffected, but values saved earlier keep showing on the live pages.

Known limits: wrong-password counting is per visitor address (5 per 15 minutes) and per site (30), kept in KV, so it is approximate across the world for up to about a minute; one admin user per site; the clean-up that runs every hour does not yet remove the KV records of a deleted account's panel (they cannot be reached once the site is gone).

## Limits and upgrades

Everyone gets the same defaults: **2 renames per site per 30 days, 10 MB per site (largest file 5 MB), 10 publishes per hour**, 10 sites per account, 60 name checks per hour. A customer who pays for more gets a higher number for that one limit, set by you:

```bash
npm run owner-sites -- limits person@example.com                          # what applies to this person, defaults and upgrade
npm run owner-sites -- limit person@example.com --renames 6               # more renames
npm run owner-sites -- limit person@example.com --site-mb 20 --note "paid 2026-11-02"   # a bigger site (20 MB is the most the current upload method allows)
npm run owner-sites -- limit person@example.com --reset                   # back to the defaults
```

Most an upgrade can set: renames 100, site size 20 MB, publishes 200 per hour. To change the defaults for **everyone**, add plain variables to the main Worker in the Cloudflare dashboard (Workers & Pages, `21stdev`, Settings, Variables): `DEFAULT_RENAMES_PER_30_DAYS`, `DEFAULT_SITE_MB`, `DEFAULT_PUBLISHES_PER_HOUR`. They apply at once, no deploy; a missing or invalid value leaves the built-in number. The builder tells people the number and says "More is available: ask edvlabs" while an upgrade is possible. Needs the migration `20261030230000_account_limits.sql` (apply it before the matching code goes live; **applied 2026-10-30 to the `edvlabs` project and tested there with a rolled-back block**: the old four-argument call still works and defaults to 2, a limit of 4 allows exactly four renames, a limit of 0 refuses, the table refuses 21 MB, 101 renames, 0 publishes per hour and a 301-character note, the browser can only read, only the server's key can run `rename_site`; nothing was left behind). Plan: `docs/superpowers/plans/2026-10-30-account-limits.md`.

## Everyday tools

```bash
npm run owner-sites -- list                         # every site, its owner, status, version
npm run owner-sites -- block bad-name               # stop serving a site (within the hour; it prints the command for doing it at once)
npm run owner-sites -- unblock bad-name             # its owner may publish it again
npm run owner-sites -- grant person@example.com --count 2 --years 1   # paid places by hand, until payment (Stripe) exists
```

A blocked site cannot be changed by its owner. People who report a site can write from the contact page; add a line about reporting to the "not available" page text in `functions/lib/sites-serve.js` once you have an address for it.

## Renaming (added 2026-10-30)

Needs the database function in `supabase/migrations/20261030210000_rename_site.sql` **before** the matching main-site code goes live (apply the file first, then push). A site can be renamed twice in 30 days; the old address redirects to the new one for 90 days and stays reserved for its owner. Nothing to set up in Cloudflare. **Applied 2026-10-30 to the `edvlabs` project** and tested on the real database inside a block that always rolls back (normal rename, the old name's 90-day hold, no redirect chains, same name, name taken, held by someone else, twice-in-30-days limit, blocked site, wrong owner, renaming back to one's own held name, an expired hold taken over, the table's own name rule); nothing was left behind, and only the server's key can run the function.

## What runs by itself every hour

At minute 17 the main Worker (cron in `wrangler.jsonc`) cleans up:

- sites whose account was deleted (files and address removed);
- sites whose payment ended more than 14 days ago (taken offline; files are kept);
- name holds that ran out (name freed, old redirect removed);
- sites you blocked (the block is copied into the lookup).

- sites whose payment ended more than 14 + 90 days ago: their files are deleted from R2 (the name and the row stay, so the person can publish again after renewing); at most 25 per run, and a failing site is retried next time;
- folders in R2 that belong to no site (left behind by a failure): deleted, but never more than 25 in a run and never when more than half of all folders look like strays (that would mean the database answered wrongly, so it only reports it).

## Turning it off, and undoing it

- **Stop all published sites at once:** Cloudflare → Workers & Pages → `edvlabs-sites` → Settings → Triggers → remove the route `*.edvlabs.com/*` (or `npx wrangler delete -c wrangler.sites.jsonc`). Addresses then stop working; nothing is deleted. Add the route back (redeploy) to restore.
- **Stop new publishing:** remove the `SUPABASE_SERVICE_ROLE_KEY` secret (`npx wrangler secret delete SUPABASE_SERVICE_ROLE_KEY`); the endpoints answer 503 and the box in the builder hides itself.
- **One site:** `npm run owner-sites -- block <name>`.

## If something does not work

| What you see | Likely cause |
| --- | --- |
| The builder has no "Put it online" box | You are not signed in (it shows a sign-in invitation), or the publishing endpoints answer 503: some of `SUPABASE_SERVICE_ROLE_KEY`, the `SITES` binding, the `SITES_BUCKET` binding are missing. `curl -s -H "Authorization: Bearer x" https://edvlabs.com/api/my-sites` shows `missing` with their names. |
| "Publishing on an edvlabs address is a paid extra" | The account has no unused paid place. `npm run owner-sites -- grant <email>`. |
| A new site shows the "Nothing here yet" page | KV not yet updated (up to a minute), or the sites Worker uses a different KV namespace than the main Worker (check both ids are the same). |
| Every `name.edvlabs.com` shows a Cloudflare error | The wildcard DNS record is missing or not proxied, or the sites Worker is not deployed. |
| The address works but `www` is wrong | See step 5. |
| `wrangler deploy -c wrangler.sites.jsonc` fails with a namespace error | The placeholder id in `wrangler.sites.jsonc` was not replaced. |

## Known limits (also in the plan)

- **Scripts are checked against the library** (2026-10-30): a published `.js` file must be exactly what the builder produces from the library's own block scripts, read from the builder's own files on the same Worker (`/builder/features/<slug>/script.js` and `/builder/export-assets.json`, both staged by `npm run build:site`). If a block's script changes in a new deploy, an old open builder tab can no longer publish and the person is told to reload. Details: `docs/superpowers/plans/2026-10-30-script-allowlist.md`.
- Deleted accounts' sites can stay online for up to an hour. Lapsed sites' files are not removed after 90 days yet. 

## Own domains (added 2026-10-31)

A customer can show their website at their own domain (for example `www.bakery-anna.com`) instead of `<name>.edvlabs.com`. They add one DNS record at their domain provider; Cloudflare for SaaS issues the certificate; the old edvlabs address then redirects (301) to their domain. Plan and design: `docs/superpowers/plans/2026-10-31-custom-domain.md`. Code is deployed (both Workers, 2026-10-31) and **stays off (the endpoints answer 503, the account page shows nothing about domains) until the steps below are done.** Only sub-names work (`www.`, `shop.`); a bare domain needs the customer to send it to `www` at their provider.

**Cost** (checked in Cloudflare's docs 2026-10-31): Cloudflare for SaaS includes 100 custom hostnames on any plan, then $0.10 per extra hostname per month. Check your billing page, I cannot see it.

Owner steps, in this order (all in the Cloudflare dashboard for `edvlabs.com`; nothing here goes into git):

1. **Fallback origin record (done 2026-10-31).** DNS → Add record: type `AAAA`, name `sites`, content `100::`, **Proxied**. (The wildcard `*` already covers `sites.edvlabs.com`, so it may exist; the point is that `sites` is proxied and has no real server behind it.)
2. **Turn on Cloudflare for SaaS and set the fallback origin (done 2026-10-31, Active).** SSL/TLS → **Custom Hostnames** → enable, then *Fallback Origin*: `sites.edvlabs.com` → Add. Wait until it shows **Active**.
3. **Zone id.** Dashboard → `edvlabs.com` → Overview → right column → *Zone ID*. It is not a secret.
4. **API token for the main Worker.** My Profile → API Tokens → Create Token → Custom: permission **Zone → SSL and Certificates → Edit**, zone resources **Include → Specific zone → edvlabs.com**, nothing else. Copy it once.
5. **Give the main Worker both settings** (Workers & Pages → `21stdev` → Settings → Variables and Secrets):
   - variable `CF_ZONE_ID` = the zone id from step 3 (plain text),
   - secret `CLOUDFLARE_API_TOKEN` = the token from step 4. Or from the terminal: `npx wrangler secret put CLOUDFLARE_API_TOKEN` and paste it when asked.
6. **Routes: done 2026-10-31.** The sites Worker now also holds the route `*/*` (Cloudflare accepted it once Custom Hostnames was enabled), and the main Worker holds an explicit route `edvlabs.com/*` (in `wrangler.jsonc`). **Keep both:** without the second one the catch-all took the bare domain from the main Worker (everything on `edvlabs.com` answered 404 for about a minute during the first attempt, rolled back at once). Any new proxied name with its own server needs its own route too, as in step 5 above.
6b. **Check the `www` redirect rule (found 2026-10-31 on the first real domain).** Rules → Redirect Rules → the "www to root" rule must match **only** `www.edvlabs.com`: condition `(http.host eq "www.edvlabs.com")`. Cloudflare's "Redirect from WWW to root" template matches every host that starts with `www.`, and Redirect Rules run before Workers, so it also catches customers' domains (`www.theirdomain.com` is redirected to `theirdomain.com` and never reaches the site). Symptom: a confirmed domain answers `301` to its own bare address with none of our security headers.
7. **Try it with a domain of your own** (any domain or sub-domain you control): sign in, My websites → *Use my own domain*, add the record shown, wait for "Your domain is working". Then check:
   - `curl -sI https://<your host name>/` shows `200` and the site's security headers;
   - `curl -sI https://<name>.edvlabs.com/` shows `301` and `location: https://<your host name>/`;
   - `https://edvlabs.com/`, `https://edvlabs.com/builder/` and the account page still work (`npm run check-headers -- https://edvlabs.com`).
8. Remove the test domain from the account page; the edvlabs address serves the site again.

Everyday: a domain that is still waiting after a day shows an extra TXT record under "Still waiting after an hour?"; most customers never need it. The hourly clean-up removes the Cloudflare entry of any domain whose site or account was deleted. Look at what Cloudflare holds: dashboard → SSL/TLS → Custom Hostnames. To switch the feature off, delete the secret `CLOUDFLARE_API_TOKEN` from the main Worker: the endpoints answer 503 and the account page shows nothing about domains, while domains that are already active keep working (they only need the sites Worker and KV).

Known limits: a site's `sitemap.xml`, canonical link and share tags still name the address the customer typed in the builder; if they used the edvlabs address, search engines follow the 301 to the domain. A site that goes offline or is unpublished keeps its domain attached and shows "not available" there; the customer can remove the domain from the account page. Bare domains are not supported yet.

## Paying for a place with Stripe (test mode first)

Plan: `docs/superpowers/plans/2026-10-31-stripe-publish-places.md`. Code is built and tested (`npm run test:payment`); nothing is deployed or applied yet. Do these in order, with **test mode** switched on in the Stripe dashboard (the "Test mode" / sandbox toggle).

1. **Supabase:** run `supabase/migrations/20261031140000_stripe_payments.sql` in the SQL Editor (adds two Stripe columns to `site_entitlements`; the browser cannot read them).
2. **Stripe (test mode):** Product catalog → add a product "Publishing place (1 year)", one-time price (you choose the amount). Copy the **Price ID** (`price_…`). Developers → API keys → copy the test **secret key** (`sk_test_…`).
3. **Webhook (test mode):** Developers → Webhooks → add endpoint `https://edvlabs.com/api/stripe-webhook`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`. Copy its **signing secret** (`whsec_…`).
4. **Worker settings** (main Worker `21stdev`; secrets never go in git):
   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY      # sk_test_…
   npx wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_…
   ```
   and add the plain variable `STRIPE_PRICE_ID` (`price_…`) in the dashboard (Settings → Variables). `keep_vars` keeps it across deploys.
5. **Try it:** builder → Put it online → "Buy a place" → card `4242 4242 4242 4242`, any future date, any CVC. Back in the builder the place appears within a few seconds. Declined card: `4000 0000 0000 0002`. Refund the payment in the Stripe dashboard: the place becomes `refunded`.
6. **Going live later:** repeat steps 2–4 in live mode (live product/price, live key, a live webhook endpoint with its own `whsec_…`), then one small real payment and refund. Settle VAT and invoices with the accountant first (plan E8.1, E8.4).
