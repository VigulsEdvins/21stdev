/* The Cloudflare Worker in front of the static site (wrangler.jsonc: main). Only /api/* reaches it first (run_worker_first);
   pages, styles and scripts are served straight from site/ with the headers in site/_headers. */
import http from '../functions/lib/lead-http.js';
import publishHttp from '../functions/lib/publish-http.js';

export default {
  fetch: (request, env) => http.route(request, env, (r) => env.ASSETS.fetch(r)),
  // the hourly clean-up of published sites (cron in wrangler.jsonc); it does nothing until publishing is set up
  scheduled: (event, env, ctx) => { ctx.waitUntil(publishHttp.scheduled(env)); }
};
