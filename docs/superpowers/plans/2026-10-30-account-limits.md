# Limits for everyone, more for those who pay (plan, 2026-10-30)

Status: **owner decisions 2026-10-30 (below); being built.** Follows `2026-10-30-publish-subdomain.md`.

## Decisions (owner)

1. Everyone gets the **same default limits**. A customer who wants more can pay for it.
2. What can be bought: **renames per month**, **site size**, **publishes per hour**. Not bought: number of sites (each site already needs its own paid place; the safety cap of 10 per account stays), and the name-check limit (an abuse guard).
3. Until online payment (Stripe) exists, the owner sets an upgrade **by hand** with one command after the customer pays. Stripe will later write the same settings.

## The limits

| Limit | Default (everyone) | Most a paid upgrade can set | Where it is enforced |
| --- | --- | --- | --- |
| Renames of one site | 2 per 30 days | 100 | database function `rename_site` (takes the number) |
| Size of one site | **10 MB** (was 20 MB; the largest file is half of it, at least 5 MB) | **20 MB** | `checkFiles` in `functions/lib/publish.js` |
| Publishes per account | 10 per hour | 200 | `publish()` |
| Renames per account, any site | 10 per hour (abuse guard, fixed) | – | `rename()` |
| Name checks per account | 60 per hour (abuse guard, fixed; new) | – | `nameStatus()` |
| Sites per account | 10 (safety cap, fixed) | – | database trigger |

**Why 20 MB is the ceiling for now:** a page is sent as one request with files written as text (base64 adds a third). The Worker holds the text, its parsed copy and the decoded files at once, and a Worker has 128 MB of memory. 20 MB of files is about 28 MB on the wire and comfortably inside that; much more would need a different way of uploading (in pieces), which is a separate piece of work. The default of 10 MB was chosen so that an upgrade means something (typical pages are well under 5 MB); say if you want another default.

## How

- **Defaults** are Worker settings (plain variables in the Cloudflare dashboard; built-in numbers are used when one is missing): `DEFAULT_PUBLISHES_PER_HOUR`, `DEFAULT_RENAMES_PER_30_DAYS`, `DEFAULT_SITE_MB`. Values outside the allowed range are ignored.
- **Per account**: a new table `public.account_limits` (one row per person, each column empty = the default). Only the server writes it; the owner reads their own row. The same row is what Stripe will write later.
- `functions/lib/limits.js` turns defaults plus the row into the limits one request uses.
- The owner command: `npm run owner-sites -- limits <email|id>` shows what applies; `limit <email|id> --renames 6 --site-mb 20 --publishes 30` sets an upgrade; `limit <email|id> --reset` removes it.
- The builder says the number in plain words when a limit stops something, and shows renames left; it says more is available from edvlabs (a pay button replaces that line when Stripe exists).

## Order

1. Migration (new table; `rename_site` takes the number, old signature dropped). 2. `limits.js`, `publish.js`, `publish-http.js`, store and fake. 3. owner command. 4. builder messages. 5. tests at every step; the migration is applied and tested on the real database (rolled-back block) only after the owner says so.
