#!/usr/bin/env node
/**
 * Owner tools for published sites (plan 2026-10-30-publish-subdomain.md, step 8). Run from your own computer; they use the Supabase SERVICE key,
 * so keep it in the shell or in the private .dev.vars file, never in git.
 *   npm run owner-sites -- list                       every site: name, owner, status, version
 *   npm run owner-sites -- block <name>               stop serving a site (within the hour; the command for doing it at once is printed)
 *   npm run owner-sites -- unblock <name>             let its owner publish it again (it stays offline until they do)
 *   npm run owner-sites -- grant <email|user-id> [--count 1] [--years 1]    add paid places by hand, standing in for payment until Stripe exists
 *   npm run owner-sites -- limits <email|user-id>      what one person may do: the defaults for everyone and any upgrade
 *   npm run owner-sites -- limit <email|user-id> [--renames N] [--site-mb N] [--publishes N] [--note "text"]   set an upgrade (only the numbers given change)
 *   npm run owner-sites -- limit <email|user-id> --reset                                                  back to the defaults
 * Settings: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
const fs = require('fs');
const path = require('path');
const store = require('../functions/lib/sites-store.js');
const Limits = require('../functions/lib/limits.js');

const USAGE = 'Usage: npm run owner-sites -- list | block <name> | unblock <name> | grant <email|user-id> [--count N] [--years N] | limits <email|user-id> | limit <email|user-id> [--renames N] [--site-mb N] [--publishes N] [--note text] [--reset]';
const isName = (t) => typeof t === 'string' && t.length >= 3 && t.length <= 30 && t.split('-').every((piece) => /^[a-z0-9]+$/.test(piece));

function readVars(file) {
  const out = {};
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return out; } // no private file
  for (const raw of text.split('\n')) {
    const line = raw.trim(), i = line.indexOf('=');
    if (!line || line.startsWith('#') || i < 1) continue;
    let value = line.slice(i + 1).trim();
    if (value.length > 1 && (value[0] === '"' || value[0] === "'") && value[value.length - 1] === value[0]) value = value.slice(1, -1);
    out[line.slice(0, i).trim()] = value;
  }
  return out;
}

const flag = (args, name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : fallback; };

/** Finds a person by email through Supabase's admin API (the service key is needed). Returns the user id or null. */
async function userIdFor(env, who, f) {
  if (store.UUID.test(who)) return who;
  const base = env.SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/admin/users';
  for (let page = 1; page <= 50; page++) {
    const r = await f(base + '?per_page=200&page=' + page, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } });
    if (!r.ok) throw new Error('Could not list accounts (' + r.status + '). Check SUPABASE_URL and the service key.');
    const users = (await r.json()).users || [];
    const hit = users.find((u) => String(u.email || '').toLowerCase() === who.toLowerCase());
    if (hit) return hit.id;
    if (users.length < 200) return null;
  }
  return null;
}

/** Runs one command. `say` prints a line. Returns an exit code. */
async function run(argv, env, say, fetchImpl) {
  const [cmd, arg] = argv;
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !env[k]);
  if (!['list', 'block', 'unblock', 'grant', 'limits', 'limit'].includes(cmd)) { say(USAGE); return 2; }
  if (missing.length) { say('Missing setting(s): ' + missing.join(', ') + '. Put them in your shell or in .dev.vars (never in git).'); return 2; }
  const f = fetchImpl || fetch, db = store.createDb(env, f);

  if (cmd === 'list') {
    const r = await f(env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/published_sites?select=name,status,version,user_id,published_at&order=created_at.desc&limit=500', { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } });
    if (!r.ok) { say('Could not read the sites (' + r.status + ').'); return 1; }
    const rows = await r.json();
    say(rows.length ? rows.map((x) => [x.name.padEnd(30), x.status.padEnd(12), 'v' + x.version, x.user_id].join('  ')).join('\n') : 'No sites yet.');
    return 0;
  }

  if (cmd === 'block' || cmd === 'unblock') {
    if (!arg || !isName(arg)) { say(USAGE); return 2; }
    const site = await db.siteByName(arg);
    if (!site) { say('No site is called "' + arg + '".'); return 1; }
    if (cmd === 'block') {
      await db.setStatus(site.id, 'blocked');
      const record = JSON.stringify({ id: site.id, version: site.version, status: 'blocked' });
      say('Blocked ' + arg + '. Visitors stop seeing it within the hour (the hourly clean-up copies the block into the lookup).');
      say('To stop it at once, run (needs your Cloudflare login and the SITES namespace id):');
      say("  npx wrangler kv key put --remote --namespace-id <SITES namespace id> 'site:" + arg + "' '" + record + "'");
    } else {
      await db.setStatus(site.id, 'unpublished');
      say('Unblocked ' + arg + '. It stays offline until its owner publishes it again.');
    }
    return 0;
  }

  if (cmd === 'limits' || cmd === 'limit') {
    if (!arg) { say(USAGE); return 2; }
    const id = await userIdFor(env, arg, f);
    if (!id) { say('No account found for "' + arg + '". The person must have created an account first.'); return 1; }
    if (cmd === 'limit') {
      if (argv.includes('--reset')) { await db.clearAccountLimits(id); say('Back to the defaults for ' + arg + '.'); return 0; }
      const given = { renames_per_30_days: flag(argv, 'renames'), max_site_mb: flag(argv, 'site-mb'), publishes_per_hour: flag(argv, 'publishes') };
      const names = { renames_per_30_days: 'renamesPer30Days', max_site_mb: 'siteMb', publishes_per_hour: 'publishesPerHour' };
      const patch = {};
      for (const [col, v] of Object.entries(given)) {
        if (v === undefined) continue;
        if (Limits.whole(v, names[col]) === null) { const [lo, hi] = Limits.RANGE[names[col]]; say('--' + { renames_per_30_days: 'renames', max_site_mb: 'site-mb', publishes_per_hour: 'publishes' }[col] + ' must be a whole number from ' + lo + ' to ' + hi + '.'); return 2; }
        patch[col] = v;
      }
      const noteAt = argv.indexOf('--note');
      if (noteAt >= 0) { const note = String(argv[noteAt + 1] || '').slice(0, 300); patch.note = note; }
      if (!Object.keys(patch).length) { say('Give at least one of --renames, --site-mb, --publishes, --note, or --reset.'); return 2; }
      await db.setAccountLimits(id, patch);
    }
    const row = await db.accountLimits(id), defaults = Limits.defaultsFrom(env), now = Limits.resolve(defaults, row);
    const line = (label, key, col, unit) => '  ' + label.padEnd(26) + String(now[key]).padStart(4) + unit + '   (everyone: ' + defaults[key] + (row && row[col] != null ? ', upgrade: ' + row[col] : ', no upgrade') + ')';
    say(['For ' + arg + ':', line('Renames of a site', 'renamesPer30Days', 'renames_per_30_days', ' per 30 days'), line('Size of a site', 'siteMb', 'max_site_mb', ' MB'), line('Publishes', 'publishesPerHour', 'publishes_per_hour', ' per hour'), row && row.note ? '  Note: ' + row.note : ''].filter(Boolean).join('\n'));
    return 0;
  }

  /* grant */
  if (!arg) { say(USAGE); return 2; }
  const count = flag(argv, 'count', 1), years = flag(argv, 'years', 1);
  if (!Number.isInteger(count) || count < 1 || count > 20 || !(years > 0 && years <= 10)) { say('--count must be 1 to 20 and --years 1 to 10.'); return 2; }
  const id = await userIdFor(env, arg, f);
  if (!id) { say('No account found for "' + arg + '". The person must have created an account first.'); return 1; }
  const until = new Date(Date.now() + years * 365 * 86400000).toISOString();
  for (let i = 0; i < count; i++) await db.insertEntitlement({ user_id: id, status: 'active', paid_until: until, granted_by: 'owner' });
  say('Added ' + count + ' paid place' + (count === 1 ? '' : 's') + ' for ' + arg + ', each valid until ' + until.slice(0, 10) + '.');
  return 0;
}

if (require.main === module) {
  const env = Object.assign({}, readVars(path.join(__dirname, '..', '.dev.vars')), process.env);
  run(process.argv.slice(2), env, (l) => console.log(l)).then((code) => process.exit(code), (e) => { console.error('Failed: ' + e.message); process.exit(1); });
}
module.exports = { run, userIdFor, readVars };
