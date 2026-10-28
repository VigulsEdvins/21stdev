#!/usr/bin/env node
/**
 * Runs the public site on your own computer the way Cloudflare serves it: the pages from site/ with the headers from site/_headers
 * (so the security policy is enforced and mistakes show up here), and the same /api/lead and /api/config answers the live Worker gives.
 *   npm run dev:site            then open http://localhost:4173/            (PORT=... to change the port)
 * Settings come from a private file, .dev.vars, in the repository folder (git ignores it; copy .dev.vars.example), or from the shell.
 * They are the same names as on Cloudflare: SUPABASE_URL, SUPABASE_ANON_KEY, LEAD_TO_EMAIL, LEAD_FROM_EMAIL, RESEND_API_KEY.
 * Careful: with the three lead settings filled in, a form you submit here really sends the email.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { route } = require('../functions/lib/lead-http.js');
const { parseHeaders } = require('./check-headers.js');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.ico': 'image/x-icon' };
const KNOWN = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'LEAD_TO_EMAIL', 'LEAD_FROM_EMAIL', 'RESEND_API_KEY', 'TURNSTILE_SECRET', 'TURNSTILE_SITE_KEY', 'LEAD_ACK'];

/** KEY=value lines (the .dev.vars format Cloudflare's own tool uses). Comments and blank lines are ignored; quotes around a value are removed. */
function parseVars(text) {
  const out = {};
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('='); if (i < 1) continue;
    let v = line.slice(i + 1).trim(); if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    out[line.slice(0, i).trim()] = v;
  }
  return out;
}
function loadEnv(file, shell) {
  let fromFile = {}; try { fromFile = parseVars(fs.readFileSync(file, 'utf8')); } catch (_) { /* no private file: only the shell */ }
  const env = {};
  for (const k of KNOWN) { const v = shell[k] !== undefined ? shell[k] : fromFile[k]; if (v) env[k] = v; }
  return env;
}

/** The headers a path gets from site/_headers: rules in file order, "! Name" removes what came before, the rest are set. Local http: no HSTS, no upgrade-insecure-requests. */
function headersFor(rules, pathname) {
  const h = {};
  for (const [pattern, set] of Object.entries(rules)) {
    const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    if (!re.test(pathname)) continue;
    for (const gone of set['!detach'] || []) delete h[gone];
    for (const [k, v] of Object.entries(set)) if (k !== '!detach') h[k] = v;
  }
  delete h['strict-transport-security'];
  if (h['content-security-policy']) h['content-security-policy'] = h['content-security-policy'].replace(/;?\s*upgrade-insecure-requests/, '');
  return h;
}

function fileFor(pathname, dir = SITE) {
  let p; try { p = decodeURIComponent(pathname); } catch (_) { return null; }
  if (p.includes('\0')) return null;
  let f = path.join(dir, p.endsWith('/') ? p + 'index.html' : p);
  if (!f.startsWith(dir + path.sep) && f !== dir) return null;
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  return fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}

/** Calls `onChange(firstChangedName)` once after a burst of changes (a save writes several files) in any of the folders or files; returns a function that stops watching. */
function watchSources({ dirs = [], files = [], onChange, wait = 300 } = {}) {
  let timer = null, first = null;
  const fire = (name) => { if (first === null) first = name; clearTimeout(timer); timer = setTimeout(() => { const n = first; first = null; onChange(n); }, wait); };
  const open = [];
  const add = (target, opts, keep) => { try { open.push(fs.watch(target, opts, (_, name) => { if (name && keep(String(name))) fire(path.join(path.relative(ROOT, target), String(name))); })); } catch (_) { /* a folder that does not exist is not watched */ } };
  dirs.forEach((d) => add(d, { recursive: true }, (n) => !/(^|[\/])(\.[^\\/]+|node_modules|dist(\.tmp)?)([\\/]|$)|~$|\.sw[a-z]$/.test(n)));
  const byDir = new Map(); files.forEach((f) => { const d = path.dirname(f); byDir.set(d, (byDir.get(d) || new Set()).add(path.basename(f))); });
  byDir.forEach((names, d) => add(d, {}, (n) => names.has(n)));
  return () => { clearTimeout(timer); open.forEach((w) => w.close()); };
}

function createServer(env, { applyHeaders = true, dir = SITE, live = false } = {}) {
  // live (the local server): every answer says "check with me again", and site/_headers is read again for each request, so a change shows on the next reload
  let rules = parseHeaders(fs.readFileSync(path.join(dir, '_headers'), 'utf8'));
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) { // the same code the Worker runs
        const chunks = []; for await (const c of req) chunks.push(c);
        const body = chunks.length && !['GET', 'HEAD'].includes(req.method) ? Buffer.concat(chunks) : undefined;
        const request = new Request('http://' + (req.headers.host || 'localhost') + req.url, { method: req.method, headers: req.headers, body });
        const r = await route(request, env, async () => new Response('Not found', { status: 404 }));
        res.writeHead(r.status, Object.fromEntries(r.headers)); return res.end(Buffer.from(await r.arrayBuffer()));
      }
      let f = fileFor(url.pathname, dir), status = 200;
      if (!f) { f = path.join(dir, '404.html'); status = 404; }
      if (live) { try { rules = parseHeaders(fs.readFileSync(path.join(dir, '_headers'), 'utf8')); } catch (_) { /* mid-rebuild: keep the last rules */ } }
      const headers = Object.assign({ 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }, applyHeaders ? headersFor(rules, url.pathname) : {});
      if (live) headers['cache-control'] = 'no-cache';
      res.writeHead(status, headers); fs.createReadStream(f).pipe(res);
    } catch (e) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Something went wrong in the local server: ' + e.message); }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  const env = loadEnv(path.join(ROOT, '.dev.vars'), process.env);
  const has = (k) => (env[k] ? 'set' : 'NOT SET');
  const { buildSite } = require('./build-site.js');
  const staged = buildSite(); // the same folder Cloudflare publishes: the site plus /builder/
  const server = createServer(env, { dir: staged.out, live: true });
  server.on('error', (e) => { // the usual cause: an older copy of this server is still running
    if (e.code === 'EADDRINUSE') console.error(`Port ${port} is already in use, most likely by an older copy of this server.\nStop it, then start again:\n  pkill -f "node scripts/dev-site.js"\n  npm run dev:site\n(or use another port: PORT=4174 npm run dev:site)`);
    else console.error(e.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`edvlabs site on http://localhost:${port}/   (staged in dist/ from site/ and the builder; headers from site/_headers; builder at /builder/)`);
    console.log('  watching: a saved change rebuilds dist/ by itself; reload the page to see it (no restart, no hard reload needed)');
    console.log(`  accounts  : SUPABASE_URL ${has('SUPABASE_URL')}, SUPABASE_ANON_KEY ${has('SUPABASE_ANON_KEY')}  ->  http://localhost:${port}/account/`);
    console.log(`  lead email: LEAD_TO_EMAIL ${has('LEAD_TO_EMAIL')}, LEAD_FROM_EMAIL ${has('LEAD_FROM_EMAIL')}, RESEND_API_KEY ${has('RESEND_API_KEY')}  ->  forms really send mail only when all three are set`);
    if (!fs.existsSync(path.join(ROOT, '.dev.vars'))) console.log('  (no .dev.vars file yet: copy .dev.vars.example to .dev.vars and fill it in)');
    console.log(`  Supabase must allow this address: Authentication -> URL Configuration -> Redirect URLs: http://localhost:${port}/**`);
  });
  // rebuild into a side folder and swap it in, so a page request never meets a half-written dist/
  let building = false, again = false;
  const rebuild = (what) => {
    if (building) { again = true; return; }
    building = true;
    const tmp = staged.out + '.tmp';
    try {
      const r = buildSite({ out: tmp });
      fs.rmSync(staged.out, { recursive: true, force: true }); fs.renameSync(tmp, staged.out);
      console.log(`[${new Date().toLocaleTimeString()}] ${what} changed: dist/ rebuilt (${r.files} files). Reload the page.`);
    } catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); console.error(`[${new Date().toLocaleTimeString()}] rebuild failed (the last good dist/ is still served): ${e.message}`); }
    building = false;
    if (again) { again = false; rebuild('more files'); }
  };
  watchSources({ dirs: ['site', 'scripts', 'features', 'thumbs', 'assets/library'].map((d) => path.join(ROOT, d)), files: ['builder.html', 'builder.js', 'builder.css', 'builder-e.css', 'builder-guided.css', 'styles.css', 'registry.js'].map((f) => path.join(ROOT, f)), onChange: rebuild });
}
module.exports = { createServer, parseVars, loadEnv, headersFor, fileFor, watchSources };
