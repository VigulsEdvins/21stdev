/* The Cloudflare Worker for client design previews: <name>--pv.edvlabs.com (wrangler.previews.jsonc routes *--pv.edvlabs.com/* here).
   Files come from the static assets (previews/, built by scripts/preview/make-preview.js). Logic and reasons: functions/lib/previews-serve.js. */
import serve from '../functions/lib/previews-serve.js';

export default {
  fetch: (request, env) => serve.createPreviewServer({ assets: env.ASSETS, domain: env.PREVIEWS_DOMAIN || 'edvlabs.com', suffix: env.PREVIEWS_SUFFIX || 'pv' }).handle(request)
};
