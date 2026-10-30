/* The HTTP side of lead intake: POST /api/lead. Used by the Cloudflare Worker (src/worker.js) and by the Pages Function
   (functions/api/lead.js), so the behaviour is the same in both and can be tested here without a network.
   Settings (never in git): LEAD_TO_EMAIL, LEAD_FROM_EMAIL, RESEND_API_KEY; optional KV binding LEADS (rate limit and repeat marking),
   optional TURNSTILE_SECRET + TURNSTILE_SITE_KEY (together: the contact and start pages show the Cloudflare spam check and /api/lead refuses a message without a passed check),
   optional LEAD_ACK=1; TURNSTILE_SITE_KEY alone switches on the spam check on the account page (its secret goes into Supabase, not here). All the lead rules are in ./lead.js. */
const lead = require('./lead.js');
const publishHttp = require('./publish-http.js');
const { handle, resendMailer } = lead;

// _headers only covers static files, so the API answers carry their own security headers
const json = (status, body, extra) => new Response(JSON.stringify(body), { status, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin' }, extra || {}) });

async function turnstileOk(token, secret, ip) {
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: token || '', remoteip: ip || '' }) });
  return r.ok && (await r.json()).success === true;
}

async function receive(request, env) {
  const missingLead = ['LEAD_TO_EMAIL', 'LEAD_FROM_EMAIL', 'RESEND_API_KEY'].filter((k) => !env[k]);
  if (missingLead.length) return json(503, { ok: false, errors: ['Sending is not set up yet.'], missing: missingLead }); // names only, never values: it tells the owner what to add
  // a secret without its public key would refuse every visitor, because no page could show the check: say so instead
  if (env.TURNSTILE_SECRET && !env.TURNSTILE_SITE_KEY) return json(503, { ok: false, errors: ['The spam check is only half set up.'], missing: ['TURNSTILE_SITE_KEY'] });
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json(403, { ok: false, errors: ['Not allowed.'] });
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json(415, { ok: false, errors: ['Send JSON.'] });
  const text = await request.text();
  if (text.length > 40000) return json(413, { ok: false, errors: ['That is too large.'] });
  let body; try { body = JSON.parse(text); } catch (e) { return json(400, { ok: false, errors: ['That was not valid JSON.'] }); }
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (env.TURNSTILE_SECRET && !(await turnstileOk(body && body.turnstile, env.TURNSTILE_SECRET, ip))) return json(403, { ok: false, errors: ['The spam check failed. Please try again.'] });
  const store = env.LEADS ? { get: (k) => env.LEADS.get(k), put: (k, v, o) => env.LEADS.put(k, v, { expirationTtl: Math.max(60, o.ttl) }) } : null;
  const r = await handle({ body, ip, honeypot: body && body.website }, { mailer: resendMailer(env.RESEND_API_KEY), store, to: env.LEAD_TO_EMAIL, from: env.LEAD_FROM_EMAIL, ack: env.LEAD_ACK === '1' });
  return json(r.status, r.json);
}

/** Routes a request: /api/lead takes leads (POST only), the four publishing endpoints (./publish-http.js), /api/config hands out the public sign-in settings, any other /api path is not found, everything else is the static site. */
async function route(request, env, serveAsset, deps) {
  const path = new URL(request.url).pathname;
  const published = await publishHttp.route(request, env, json, deps); // site-name, my-sites, publish, unpublish
  if (published) return published;
  if (path === '/api/lead') return request.method === 'POST' ? receive(request, env) : json(405, { ok: false, errors: ['Use POST.'] }, { Allow: 'POST' });
  // The Supabase address and the public (anon) key, so the static pages hold neither. Both are meant to be public; the secret key never goes here.
  if (path === '/api/config') return request.method === 'GET' ? (env.SUPABASE_URL && env.SUPABASE_ANON_KEY ? json(200, Object.assign({ supabaseUrl: env.SUPABASE_URL, anonKey: env.SUPABASE_ANON_KEY }, env.TURNSTILE_SITE_KEY ? { turnstileSiteKey: env.TURNSTILE_SITE_KEY } : {}), { 'Cache-Control': 'no-store' }) : json(503, { ok: false, errors: ['Accounts are not set up yet.'], missing: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'].filter((k) => !env[k]) })) : json(405, { ok: false, errors: ['Use GET.'] }, { Allow: 'GET' });
  // The public key of the spam check, for the contact and start pages (the account page gets it from /api/config). Public by design; the secret never goes here.
  if (path === '/api/form-check') return request.method === 'GET' ? json(200, env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET ? { turnstileSiteKey: env.TURNSTILE_SITE_KEY } : {}, { 'Cache-Control': 'no-store' }) : json(405, { ok: false, errors: ['Use GET.'] }, { Allow: 'GET' });
  if (path.startsWith('/api/')) return json(404, { ok: false, errors: ['Not found.'] });
  return serveAsset(request);
}

module.exports = { receive, route, json };
