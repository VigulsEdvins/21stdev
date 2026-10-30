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
const store = require('../functions/lib/sites-store.js');

async function start({ port }) {
  const auth = await startAuth({ confirmEmails: false });
  const f = Fake.create();
  const direct = { SUPABASE_URL: auth.url, SUPABASE_ANON_KEY: auth.anonKey }; // how this server talks to the pretend service
  const env = { SUPABASE_URL: 'http://localhost:' + port + '/__auth', SUPABASE_ANON_KEY: auth.anonKey }; // how the pages do: through this server, so the page's own security rules allow it
  const publisher = P.createPublisher({ db: f.db, bucket: f.bucket, kv: f.kv, now: () => new Date().toISOString(), domain: 'localhost', addressOf: (name) => 'http://' + name + '.localhost:' + port + '/' });
  const seen = new Set();
  const inAYear = () => new Date(Date.now() + 365 * 86400000).toISOString();
  /* the real sign-in check, asked of the pretend service; a person met for the first time gets two paid places */
  const user = async (token) => {
    const u = await store.verifyUser(direct, token);
    if (u && !seen.has(u.id)) { seen.add(u.id); f.addEntitlement(u.id, inAYear()); f.addEntitlement(u.id, inAYear()); }
    return u;
  };
  return {
    env, deps: { user, publisher }, auth, store: f,
    sites: S.createSiteServer({ bucket: f.bucket, kv: f.kv, domain: 'localhost' }),
    explain: (p) => [
      '  DEMO PUBLISHING is on: a pretend sign-in service and pretend storage, forgotten when this stops.',
      `    1. create an account at http://localhost:${p}/account/  (any email and a password with 10+ characters; no email is sent)`,
      `    2. build a page at http://localhost:${p}/builder/, step 5 "Get it", box "Put it online" (each new account has 2 paid places)`,
      `    3. open the address it shows, like http://bakery-anna.localhost:${p}/`
    ],
    close: () => auth.close()
  };
}

module.exports = { start };
