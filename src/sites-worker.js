/* The Cloudflare Worker for published sites: every <name>.edvlabs.com that is not an address of its own (wrangler.sites.jsonc routes *.edvlabs.com/* here).
   It reads KV (SITES, which names the live version) and R2 (SITES_BUCKET, which holds the files). The only things it writes are, for a site with an admin panel
   (/admin<digits>, see functions/lib/site-admin-serve.js), the customer's saved edits (R2) and the time of their last sign-in (KV). It has no database key.
   Publishing is done by the main Worker (src/worker.js). */
import serve from '../functions/lib/sites-serve.js';
import adminServe from '../functions/lib/site-admin-serve.js';

export default {
  fetch: (request, env) => {
    // ADMIN_SESSION_SECRET (a secret) signs the admin sessions; without it the admin panel stays closed
    const admin = env.ADMIN_SESSION_SECRET ? adminServe.createAdminServer({ kv: env.SITES, bucket: env.SITES_BUCKET, secret: env.ADMIN_SESSION_SECRET }) : undefined;
    return serve.createSiteServer({ bucket: env.SITES_BUCKET, kv: env.SITES, domain: env.SITES_DOMAIN || 'edvlabs.com', admin }).handle(request);
  }
};
