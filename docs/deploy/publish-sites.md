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
- [ ] **Videos:** a block that uses a video file does not publish the video yet (that file kind is not accepted). Tell me if a block you care about shows a broken video.
- [ ] Take it offline from the builder; the address shows "This site is not available". Put it back.
- [ ] Open `https://edvlabs.com/builder/` and the home page again: nothing about the main site changed. (Also the usual first-deploy header check: `npm run check-headers -- https://edvlabs.com` and `node scripts/check-builder-csp.js https://edvlabs.com`.)

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

Deleting a lapsed site's files after 90 days is **not built yet**; they stay in R2 until then (small cost).

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
