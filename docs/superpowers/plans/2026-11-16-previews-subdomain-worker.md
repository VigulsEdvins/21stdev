# Client previews at `<name>--pv.edvlabs.com` (option C) — handoff plan

Status: **built and live (2026-11-16); the everyday procedure is the `client-preview` skill.** Since then: every page carries a 3-step booking form in the page's own colours (`scripts/preview/form-palette.browser.js`, report `npm run preview:palettes`), briefs and photos are kept in `previews-src/<token>/` (`npm run preview:client -- --rebuild all`), screenshots `npm run preview:shots -- <token>`.
Earlier status line: **built and live (2026-11-16).** Route verified on `*--pvtest` first; apex, www and customer sites unchanged. Random part: 6 hex (decided). Diadents and Paegle have addresses in `previews/_hosts.json`; the CRM makes `designPreviews.host` and the panel builds the link; both skills updated. Open: standing deploy permission (still per-deploy go-ahead), existing CRM sets without `host`.

## Where things stand (2026-11-16)
- Previews are built into `web-for-options/previews/<token>/` (git-ignored; shell page `index.html` with tabs + phone view + "choose" mailto; three variant folders; `credits.json`). Two real clients are in it: Diadents (`e90af850009a0d05`) and I. Paegles ārsta prakse (`bf5c3b4aa77ca77b`), both also in the CRM (`system-for-clients/data/crm.json`) with `designPreviews {token, slugs}`.
- **Nothing is deployed.** wrangler is logged in as the owner's Cloudflare account (OAuth); there are no Pages projects yet. Each deploy replaces the whole site with the folder, so `previews/` must never be deleted.
- Option A (Pages, token in path) works today: `npx wrangler pages project create edv-previews --production-branch main`, then `npx wrangler pages deploy previews --project-name edv-previews`.

## The design for C
- Address `diadents--pv.edvlabs.com`, or with a random part `diadents-7k2m--pv.edvlabs.com` (**owner decides**: pretty vs unguessable).
- Customer site names cannot contain `--` (`functions/lib/payment.js` `siteNameOk`), so a host ending in `--pv` can never be a customer's site.
- New Worker `edv-previews` (own config `wrangler.previews.jsonc`, static assets = `previews/`), route `*--pv.edvlabs.com/*` in zone edvlabs.com. It reads the host label, looks it up in `previews/_hosts.json` (`{"diadents-7k2m": "e90af850009a0d05"}`), serves `/<token>/…` from the assets (404 otherwise), sets `X-Robots-Tag: noindex, nofollow`, `Cache-Control` short. ~30 lines + a test.
- No per-client DNS (wildcard `*` exists, proxied) and no certificate work (Universal SSL covers `*.edvlabs.com`, one level). The sites Worker (`wrangler.sites.jsonc`, route `*.edvlabs.com/*` and `*/*`) is not touched.
- `make-preview.js`: allow the token form `<name>-<4hex>` (today strictly 16 hex), write/merge `previews/_hosts.json`, never delete other clients' folders. CRM: the panel link becomes `https://<host>/` (needs the host name per client: store it next to `designPreviews`, or derive it from company name + token).

## Must verify before the production deploy (the real risk)
1. A route with a leading `*` and a suffix (`*--pv.edvlabs.com/*`) is accepted by Cloudflare.
2. It wins over `*.edvlabs.com/*` of the sites Worker: test on a throw-away host first, then `curl -sI https://<an existing customer site>.edvlabs.com/` before and after the deploy (must be unchanged).
3. Wrong routing would shadow customer sites: roll back = remove the route (`npx wrangler delete -c wrangler.previews.jsonc` or dashboard Triggers).
Read `docs/deploy/publish-sites.md` (section DNS: the wildcard) and the memory note `custom-domain` before touching routes. See also `post-deploy-header-check`.

## Steps
1. `wrangler.previews.jsonc` + `src/previews-worker.js` + `tests/test-previews-worker.js` (host parsing, token lookup, 404, headers, path traversal).
2. `make-preview.js`: token form, `_hosts.json`, never wipe `previews/`; update test.
3. Owner says "deploy allowed" -> test route on a throw-away host, then real deploy, then customer-site check, then `curl -I` headers.
4. Update skills `client-preview` and `find-clients` (final step: build -> deploy -> verify links -> report; messages stay the owner's); CRM panel base URL / per-client link.
5. Rebuild Diadents and Paegle under the new host names.

## Things the owner may still decide
- Random part in the address: yes/no. - Standing permission for `wrangler deploy -c wrangler.previews.jsonc` and `wrangler pages deploy` (say "deploy allowed" or add a permission rule). - Keep option A as a fallback.
