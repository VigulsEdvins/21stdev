/* The HTTP side of publishing, in the main Worker (plan 2026-10-30-publish-subdomain.md, step 5). Four endpoints, all for signed-in people:
     GET  /api/site-name?name=…   is this name free for me (no sign-in check of the name is stored; nothing is reserved)
     GET  /api/my-sites            my sites with payment state, and how many paid places are unused
     POST /api/publish             { name, files: [{ path, content, encoding? }], projectId? }
     POST /api/unpublish           { siteId }
     POST /api/rename              { siteId, name }   the old address redirects to the new one for 90 days
   and the timer (scheduled) that cleans up. All the rules are in ./publish.js; the storage is in ./sites-store.js.
   Settings (never in git): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (secret); bindings SITES (KV) and SITES_BUCKET (R2); optional SITES_DOMAIN. */
const { createPublisher } = require('./publish.js');
const store = require('./sites-store.js');
const { createScriptChecker } = require('./script-check.js');

const NEEDED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SITES', 'SITES_BUCKET', 'ASSETS'];
const MAX_BODY = 30 * 1024 * 1024; // 20 MB of files is about 27 MB once written as text

/** The real parts, built from the Worker's settings. Tests pass their own. */
function makeDeps(env) {
  /* A block's script, from the builder's own published files (the Worker's static assets): what a page's script must be made of. */
  const library = async (slug) => {
    if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return null;
    const r = await env.ASSETS.fetch(new Request('https://assets.invalid/builder/features/' + slug + '/script.js'));
    return r.ok ? r.text() : null;
  };
  /* The files blocks load at run time, written when the site is staged (scripts/build-site.js). */
  const exportAssets = async () => {
    const r = await env.ASSETS.fetch(new Request('https://assets.invalid/builder/export-assets.json'));
    return r.ok ? r.json() : {};
  };
  /* Text made from function sources (the form-sending code); made when the site is staged, because the bundled Worker cannot make it. */
  const parts = async () => {
    const r = await env.ASSETS.fetch(new Request('https://assets.invalid/builder/script-parts.json'));
    return r.ok ? r.json() : null;
  };
  return {
    user: (token) => store.verifyUser(env, token),
    publisher: createPublisher({ db: store.createDb(env), bucket: env.SITES_BUCKET, kv: env.SITES, now: () => new Date().toISOString(), domain: env.SITES_DOMAIN, scripts: createScriptChecker({ library, exportAssets, parts }) })
  };
}

const missing = (env) => NEEDED.filter((k) => !env[k]);

/** Returns a Response for the four endpoints, or null for any other path. `json(status, body, extraHeaders)` is the Worker's answer helper. */
async function route(request, env, json, deps) {
  const url = new URL(request.url), path = url.pathname;
  const wantsGet = path === '/api/site-name' || path === '/api/my-sites', wantsPost = path === '/api/publish' || path === '/api/unpublish' || path === '/api/rename';
  if (!wantsGet && !wantsPost) return null;
  if (request.method !== (wantsGet ? 'GET' : 'POST')) return json(405, { ok: false, errors: ['Use ' + (wantsGet ? 'GET' : 'POST') + '.'] }, { Allow: wantsGet ? 'GET' : 'POST' });
  const absent = missing(env);
  if (absent.length && !deps) return json(503, { ok: false, errors: ['Publishing is not set up yet.'], missing: absent }); // names only, never values
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return json(403, { ok: false, errors: ['Not allowed.'] });

  const auth = request.headers.get('Authorization') || '';
  const token = /^Bearer (\S+)$/.exec(auth) ? auth.slice(7) : '';
  const d = deps || makeDeps(env);
  const user = token ? await d.user(token) : null;
  if (!user) return json(401, { ok: false, errors: ['Please sign in.'] });
  const pub = d.publisher, reply = (r) => json(r.status, r.json);

  if (path === '/api/site-name') return reply(await pub.nameStatus(user.id, url.searchParams.get('name')));
  if (path === '/api/my-sites') return reply(await pub.mySites(user.id));

  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json(415, { ok: false, errors: ['Send JSON.'] });
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY) return json(413, { ok: false, errors: ['That is too large.'] });
  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { ok: false, errors: ['That is too large.'] });
  let body; try { body = JSON.parse(text); } catch (e) { return json(400, { ok: false, errors: ['That was not valid JSON.'] }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { ok: false, errors: ['That was not valid JSON.'] });

  if (path === '/api/rename') {
    if (typeof body.siteId !== 'string' || !store.UUID.test(body.siteId) || typeof body.name !== 'string') return json(400, { ok: false, errors: ['Send the site and the new name.'] });
    try { return reply(await pub.rename({ userId: user.id, siteId: body.siteId, newName: body.name })); } catch (e) { return json(500, { ok: false, errors: ['Renaming did not work just now. Please try again.'] }); }
  }
  if (path === '/api/unpublish') return typeof body.siteId === 'string' && store.UUID.test(body.siteId) ? reply(await pub.unpublish({ userId: user.id, siteId: body.siteId })) : json(400, { ok: false, errors: ['Which site?'] });
  const projectId = typeof body.projectId === 'string' && store.UUID.test(body.projectId) ? body.projectId : null;
  if (typeof body.name !== 'string' || !Array.isArray(body.files)) return json(400, { ok: false, errors: ['Send a name and the files.'] });
  try {
    return reply(await pub.publish({ userId: user.id, name: body.name, files: body.files, projectId }));
  } catch (e) {
    return json(500, { ok: false, errors: ['Publishing did not work just now. Please try again.'] }); // the reason stays in the Worker's own log, not in the answer
  }
}

/** The timer: nothing happens until publishing is set up. */
async function scheduled(env, deps) {
  if (!deps && missing(env).length) return null;
  try {
    const result = await (deps || makeDeps(env)).publisher.sweep();
    console.log('published sites clean-up: ' + JSON.stringify(result)); // seen with `npx wrangler tail`, or in the dashboard's logs when they are switched on
    return result;
  } catch (e) {
    console.error('published sites clean-up failed: ' + (e && e.message)); // names the problem, never the keys
    throw e;
  }
}

module.exports = { route, scheduled, makeDeps, missing, NEEDED };
