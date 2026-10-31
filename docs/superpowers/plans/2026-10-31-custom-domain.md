# Customer's own domain for a published site (plan, 2026-10-31)

Status: **built and tested; the table is applied on the real database (2026-10-31); the Cloudflare set-up in `docs/deploy/publish-sites.md` ("Own domains") is the owner's part. See "As built" at the end for what changed from the design below.** Approved by the owner 2026-10-31: A is a 301 redirect from the old address, and B to D are accepted with the recommendations below.** No code written, nothing deployed, nothing bought or switched on in Cloudflare.** Follows `2026-10-30-publish-subdomain.md` and `2026-10-31-site-admin-panel.md`.

## Goal (owner request, 2026-10-31)

A customer who owns a domain (for example `www.bakery.com`) can attach it to their published site. From then on the site **works at their domain, and not at `<name>.edvlabs.com`**: the visitor sees the customer's address in the browser bar, and the edvlabs address stops showing the site. The site stays hosted on our Cloudflare (same R2 files, same KV, same Worker). The customer keeps the domain at their own registrar and only adds one DNS record.

## What exists today

- `src/sites-worker.js` is routed by `wrangler.sites.jsonc` only for `*.edvlabs.com/*`.
- `functions/lib/sites-serve.js` finds the site from the **host name**: `nameOf(hostname)` accepts only one label under `edvlabs.com`, then reads KV `kvKey(name)` for `{ id, version, status }` or `{ redirect }` (used after a rename).
- The admin panel (`site-admin-serve.js`) already compares `Origin` with the request's own origin and uses a host-only `__Host-` cookie, so it needs no change to work on another host.

So the only real gaps are: finding a site by a host that is **not** under our domain, getting that host's **certificate and traffic** to our Worker, and making the old address stop serving.

## Design

### 1. Cloudflare for SaaS (Custom Hostnames)

One-time owner set-up on the `edvlabs.com` zone: turn on Cloudflare for SaaS and add a proxied DNS record `sites.edvlabs.com` as the **fallback origin**. The customer then adds, at their registrar:

| Record | Name | Value |
|---|---|---|
| CNAME | `www` (or any sub-name) | `sites.edvlabs.com` |
| TXT (shown by us, only if Cloudflare asks) | as shown | as shown |

Our server then creates a **custom hostname** through the Cloudflare API. Cloudflare checks that the customer controls the domain, issues and renews the certificate by itself, and sends the traffic to the Worker with the customer's host name unchanged. How the Worker is attached to custom-hostname traffic (route pattern on the zone) is **checked against the Cloudflare documentation in step 1 before anything is written**; I do not want to guess it.

### 2. Finding the site from the host

- New KV entry `host:<hostname>` → `{ name }`, written only when the hostname is **active** at Cloudflare.
- `nameOf` stays as is for `*.edvlabs.com`. For any other host the server reads `host:<hostname>` and continues with the same `kvKey(name)` record, so versions, rollback, headers, 404 page and the admin panel all work unchanged on the customer's host.
- An unknown host gets the existing plain 404, never a site.

### 3. The edvlabs address stops showing the site

When a domain becomes active, the site's KV record gets `customHost: '<hostname>'`. The `<name>.edvlabs.com` address then answers **301 to `https://<hostname><same path and query>`** (same mechanism as the rename redirect) instead of serving the page. `POST`s to the old address, including the admin panel, answer 404. Until the domain is active nothing changes: the site keeps working at the edvlabs address, so there is **no downtime while the customer sets up DNS**.

If the customer removes the domain (or the paid place ends, see 6), `customHost` is removed and the edvlabs address serves the site again.

### 4. Database (new migration, **not applied until you say so**)

One table, written only by the server, readable by its owner (same pattern as `published_sites`):

```
site_domains
  id uuid pk, user_id -> auth.users, site_id -> published_sites (unique: one domain per site)
  hostname text unique  -- lower case, punycode, checked by the same function the server uses
  status text           -- 'pending' | 'active' | 'failed' | 'removed'
  cf_hostname_id text   -- Cloudflare's id, for status checks and deletion
  dns_help jsonb        -- the records the customer must add, as returned by Cloudflare
  created_at, activated_at, updated_at
```

### 5. API (main Worker, signed-in owner only)

- `POST /api/site-domain` `{ site, hostname }`: checks sign-in, that the site is theirs and live, the limit (see question B), then validates the hostname, creates the custom hostname at Cloudflare, stores the row as `pending`, and returns the DNS records to show.
- `GET /api/site-domain?site=…`: asks Cloudflare for the current state; when it is `active`, writes `host:<hostname>` and `customHost` and sets the row `active`. The account page polls this while it shows "waiting for DNS".
- `DELETE /api/site-domain`: deletes the Cloudflare custom hostname, deletes the KV entries, row `removed`.

Hostname rules, checked on the server (the browser is not trusted): 4 to 253 characters, letters, digits, hyphens and dots, converted to punycode, at least two labels, no wildcard, no IP address, not `edvlabs.com` or anything under it, not already held by another site, and a sub-name such as `www` is recommended in the screen. Cloudflare's own ownership check is what stops someone attaching a domain they do not control; we never mark a domain active before Cloudflare says it is.

### 6. Lifecycle

- **Unpublish, rename, grace period ended, account closed:** the custom hostname is removed and `host:<hostname>` is deleted, so the customer's domain shows our "not available" page rather than another site. Rename keeps the domain attached (it points at the site id, not the name).
- **Customer's DNS later stops pointing at us:** Cloudflare reports it; the account page shows "DNS not pointing here" and the edvlabs address keeps redirecting only while the domain is `active`. If Cloudflare marks it not active, `customHost` is cleared so the site is reachable again at the edvlabs address instead of being a dead redirect.
- **Cost:** Cloudflare for SaaS includes a number of free custom hostnames and then charges per hostname per month; I will read the current price before the owner turns it on.

### 7. Things that must keep working on the customer's host

- The page's own security policy and the form delivery (`functions/lib/lead-http.js`, which today allows only requests whose `Origin` equals its own origin) were written with the edvlabs address in mind. **Step 0 is to read how a published site's forms reach the lead endpoint and whether anything compares against `*.edvlabs.com`**, and fix that before domains go live.
- HSTS: the sites Worker sends `Strict-Transport-Security` without `includeSubDomains`, which is right for a customer's own domain too.
- Cookies stay host-only. A customer's domain can never see the cookie of another site.
- The sitemap, canonical link and Open Graph address, if the export writes them, must use the customer's host once active (checked in step 5).

## Steps

0. Read the form and lead path and any other place that assumes `*.edvlabs.com`; list them in this file.
1. Read Cloudflare's documentation for Custom Hostnames and for routing a Worker to them; record the exact route and API calls here. No change to Cloudflare.
2. Migration `site_domains` (written, tested locally, **not applied**).
3. Pure rules in `functions/lib/site-domain.js`: hostname validation, state changes, KV writes. A fake Cloudflare API in `tests/lib` so tests need no network.
4. `sites-serve.js`: host lookup, redirect from the old address. Tests: unknown host, spoofed `Host`, domain before and after activation, removal brings the old address back, admin panel on the custom host.
5. HTTP routes and the account-page screen: add a domain, show the DNS records, show the state, remove it.
6. Owner steps (written in `docs/deploy/publish-sites.md`): enable Cloudflare for SaaS, create the fallback origin record, create an API token limited to Custom Hostnames on this zone, set `CLOUDFLARE_API_TOKEN` and the zone id as secrets, apply the migration, deploy.
7. Check on a real second domain the owner holds before telling any customer, including the live headers (see the post-deploy header check note).

## Questions, each with my recommendation

- **A. DECIDED: 301 redirect.** What does the old `<name>.edvlabs.com` do once the domain is active? **301 redirect to the customer's domain.** Old links, search results and anything already printed keep working, and the visitor ends up on the customer's address. The other reading of "not on site.edvlabs.com" is a plain "not available" page, which is simpler but breaks every old link.
- **B. Is a custom domain part of the paid place, or an extra?** Recommendation: part of the paid place, as one more per-account limit in `limits.js` with the same default for everyone and upgrades per account, like the other limits.
- **C. Apex domains (`bakery.com` without `www`)?** A plain CNAME is not allowed there at most registrars. Recommendation for launch: **sub-names only (`www.`, `shop.`)**, with the screen telling the customer to redirect the bare domain to `www` at their registrar. Apex support (customer moves their name servers to Cloudflare) later if customers ask.
- **D. One domain per site?** Recommendation: **yes**, one primary domain per site, as in the table above. A second one (for example both `www` and the bare domain) can redirect to it later.

## As built (2026-10-31)

Differences from the design above, and why:

- **Two lookups in KV instead of `customHost` inside the site record.** Publishing, unpublishing and the clean-up all rewrite `site:<name>`, and would have wiped a `customHost` field. So: `host:<hostname>` -> `{ name }` (which site a host shows) and `sitehost:<site id>` -> hostname (the site lives there). A host serves only while `sitehost:` names that same host, so a stale or forged `host:` entry shows nothing. `sitehost:` is written last and removed first: the edvlabs address never redirects to a host that does not answer yet.
- **Rename** moves `host:<hostname>` to the new name (`publish.js`, one added line); until it does, the old name's redirect record is followed one step.
- **Unpublish / payment ended:** the domain stays attached and shows "not available" there; the customer removes it from the account page. (The design said it would be removed automatically; keeping it avoids deleting a hostname the customer set up when a site only goes offline for a while.) A deleted site or account leaves the table row behind with empty `site_id`/`user_id`, and the hourly clean-up removes the Cloudflare entry and the row.
- **Validation:** the certificate uses Cloudflare's `http` method, so the customer adds only the CNAME. The TXT ownership record is shown only as an extra ("still waiting after an hour?").
- **Pending set-ups** hold a host name for 2 hours; after that the real owner of the domain may take it (Cloudflare still needs their DNS to prove ownership). A confirmed domain is never taken.
- **Step 0 result:** published sites' forms post to the services the customer chose (`scripts/form-delivery.js`), not to `/api/lead`, so nothing there compares against `*.edvlabs.com`. Nothing needed changing. The site's canonical link and sitemap still use the address typed in the builder; the 301 covers search engines.
- **Step 1 result:** Cloudflare's documentation says a Worker receives custom-hostname traffic through a `*/*` route on the SaaS zone (a more specific route such as `*.edvlabs.com/*` keeps winning for its own names). Free, Pro and Business plans include 100 custom hostnames, then $0.10 each per month.
- Tests: `tests/test-site-domain.js` (15 groups), `tests/e2e/site-domain.e2e.js` (browser, with a pretend Cloudflare in the local demo), and the security guard R12 now covers `site_domains` (the browser cannot read Cloudflare's id or the ownership token).
