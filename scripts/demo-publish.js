/**
 * A try-it-out mode for publishing, started by `npm run dev:site -- --demo-publish`: a pretend sign-in service (tests/lib/fake-supabase.js), pretend
 * storage in memory (tests/lib/fake-sites.js) and the REAL publishing and serving code, so the whole flow can be tried with nothing set up and nothing
 * sent anywhere: create an account at /account/, build a page, press "Put it online" in step 5, and open http://<name>.localhost:<port>/.
 * Everything is forgotten when the server stops. Every new account gets two paid places, standing in for payment. Not for any real use.
 */
const { start: startAuth } = require('../tests/lib/fake-supabase.js');
const Fake = require('../tests/lib/fake-sites.js');
const P = require('../functions/lib/publish.js');
const S = require('../functions/lib/sites-serve.js');
const SA = require('../functions/lib/site-admin.js');
const SD = require('../functions/lib/site-domain.js');
const AS = require('../functions/lib/site-admin-serve.js');
const store = require('../functions/lib/sites-store.js');
const { createScriptChecker } = require('../functions/lib/script-check.js');
const fs = require('fs');
const path = require('path');

/** A block's script from the repository's own features folder (online it comes from the deployed builder's files). */
async function libraryFromDisk(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return null;
  try { return fs.readFileSync(path.join(__dirname, '..', 'features', slug, 'script.js'), 'utf8'); } catch (_) { return null; }
}

/** Which blocks load files at run time, from the features folder (online: builder/export-assets.json, written by scripts/build-site.js). */
async function exportAssetsFromDisk() {
  const out = {};
  for (const slug of fs.readdirSync(path.join(__dirname, '..', 'features'))) {
    try { const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'features', slug, 'meta.json'), 'utf8')); if (Array.isArray(m.exportAssets) && m.exportAssets.length) out[slug] = m.exportAssets; } catch (_) { /* not a block */ }
  }
  return out;
}

async function start({ port }) {
  const auth = await startAuth({ confirmEmails: false });
  const f = Fake.create();
  f.db.projectForUser = async (id, userId) => ({ id, user_id: userId, state: {} }); // the demo has no account pages of its own: every page id the browser names is taken as the person's own
  const direct = { SUPABASE_URL: auth.url, SUPABASE_ANON_KEY: auth.anonKey }; // how this server talks to the pretend service
  const env = { SUPABASE_URL: 'http://localhost:' + port + '/__auth', SUPABASE_ANON_KEY: auth.anonKey }; // how the pages do: through this server, so the page's own security rules allow it
  /* the admin panel: the editor's files from the repository's own scripts/cms folder (online they come from the deployed builder) */
  const editorFiles = async () => {
    const out = {};
    for (const n of ['admin.html', 'admin.css', 'admin.js', 'cms.js', 'form-rules.js']) out[n] = fs.readFileSync(path.join(__dirname, 'cms', n), 'utf8');
    out['admin.html'] = out['admin.html'].replace(/href="index\.html"/g, 'href="/"');
    return out;
  };
  const siteAdmin = SA.createSiteAdmin({ db: f.db, kv: f.kv, bucket: f.bucket, now: () => new Date().toISOString(), editorFiles, address: (name) => 'http://' + name + '.localhost:' + port + '/' });
  /* own domains: a pretend Cloudflare that confirms a host name 4 seconds after it is added, as if the customer's DNS record were in place */
  const hostnames = new Map();
  const cf = {
    async create(hostname) { const h = { id: 'demo-' + hostnames.size + '-hostname', hostname, at: Date.now() }; hostnames.set(h.id, h); return { id: h.id, hostname, status: 'pending', ssl: { status: 'pending_validation' }, errors: ['custom hostname does not CNAME to this zone.'], ownership: { name: '_cf-custom-hostname.' + hostname, value: 'demo-token' } }; },
    async get(id) { const h = hostnames.get(id); if (!h) return null; const up = Date.now() - h.at > 4000; return { id, hostname: h.hostname, status: up ? 'active' : 'pending', ssl: { status: up ? 'active' : 'pending_validation' }, errors: up ? [] : ['custom hostname does not CNAME to this zone.'], ownership: null }; },
    async remove(id) { hostnames.delete(id); }
  };
  const siteDomains = SD.createSiteDomains({ db: f.db, kv: f.kv, cf, now: () => new Date().toISOString(), domain: 'localhost' });
  const publisher = P.createPublisher({ db: f.db, bucket: f.bucket, kv: f.kv, now: () => new Date().toISOString(), domain: 'localhost', addressOf: (name) => 'http://' + name + '.localhost:' + port + '/', scripts: createScriptChecker({ library: libraryFromDisk, exportAssets: exportAssetsFromDisk, parts: async () => require('./build-site.js').scriptParts() }), adminHook: siteAdmin });
  const seen = new Set();
  const inAYear = () => new Date(Date.now() + 365 * 86400000).toISOString();
  /* the real sign-in check, asked of the pretend service; a person met for the first time gets two paid places */
  const user = async (token) => {
    const u = await store.verifyUser(direct, token);
    if (u && !seen.has(u.id)) { seen.add(u.id); f.addEntitlement(u.id, inAYear()); f.addEntitlement(u.id, inAYear()); }
    return u;
  };
  return {
    env, deps: { user, publisher, siteAdmin, siteDomains }, auth, store: f,
    ownDomain: async (host) => !!(await f.kv.get('host:' + String(host || '').toLowerCase().split(':')[0])), // a pretend own domain the browser or curl reaches with a Host header
    sites: S.createSiteServer({ bucket: f.bucket, kv: f.kv, domain: 'localhost', originOf: (name) => 'http://' + name + '.localhost:' + port,
      admin: AS.createAdminServer({ kv: f.kv, bucket: f.bucket, secret: 'demo-only-session-secret-not-for-real-use', insecure: true }) }), // insecure: the demo is plain http, where a Secure cookie would not be kept
    explain: (p) => [
      '  DEMO PUBLISHING is on: a pretend sign-in service and pretend storage, forgotten when this stops.',
      `    1. create an account at http://localhost:${p}/account/  (any email and a password with 10+ characters; no email is sent)`,
      `    2. build a page at http://localhost:${p}/builder/, step 5 "Get it", box "Put it online" (each new account has 2 paid places)`,
      `    3. open the address it shows, like http://bakery-anna.localhost:${p}/`,
      `    4. in the account page, "My websites" has the button "Add admin panel"; then put the page online again from the builder and open the admin address it shows`
    ],
    close: () => auth.close()
  };
}

module.exports = { start };
