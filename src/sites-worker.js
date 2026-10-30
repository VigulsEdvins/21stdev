/* The Cloudflare Worker for published sites: every <name>.edvlabs.com that is not an address of its own (wrangler.sites.jsonc routes *.edvlabs.com/* here).
   It only reads: KV (SITES) names the live version, R2 (SITES_BUCKET) holds the files. Publishing is done by the main Worker (src/worker.js). */
import serve from '../functions/lib/sites-serve.js';

export default { fetch: (request, env) => serve.createSiteServer({ bucket: env.SITES_BUCKET, kv: env.SITES, domain: env.SITES_DOMAIN || 'edvlabs.com' }).handle(request) };
