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

function fileFor(pathname) {
  let p; try { p = decodeURIComponent(pathname); } catch (_) { return null; }
  if (p.includes('\0')) return null;
  let f = path.join(SITE, p.endsWith('/') ? p + 'index.html' : p);
  if (!f.startsWith(SITE + path.sep) && f !== SITE) return null;
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  return fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}

function createServer(env, { applyHeaders = true } = {}) {
  const rules = parseHeaders(fs.readFileSync(path.join(SITE, '_headers'), 'utf8'));
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
      let f = fileFor(url.pathname), status = 200;
      if (!f) { f = path.join(SITE, '404.html'); status = 404; }
      const headers = Object.assign({ 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }, applyHeaders ? headersFor(rules, url.pathname) : {});
      res.writeHead(status, headers); fs.createReadStream(f).pipe(res);
    } catch (e) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Something went wrong in the local server: ' + e.message); }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  const env = loadEnv(path.join(ROOT, '.dev.vars'), process.env);
  const has = (k) => (env[k] ? 'set' : 'NOT SET');
  createServer(env).listen(port, '127.0.0.1', () => {
    console.log(`edvlabs site on http://localhost:${port}/   (pages from site/, headers from site/_headers)`);
    console.log(`  accounts  : SUPABASE_URL ${has('SUPABASE_URL')}, SUPABASE_ANON_KEY ${has('SUPABASE_ANON_KEY')}  ->  http://localhost:${port}/account/`);
    console.log(`  lead email: LEAD_TO_EMAIL ${has('LEAD_TO_EMAIL')}, LEAD_FROM_EMAIL ${has('LEAD_FROM_EMAIL')}, RESEND_API_KEY ${has('RESEND_API_KEY')}  ->  forms really send mail only when all three are set`);
    if (!fs.existsSync(path.join(ROOT, '.dev.vars'))) console.log('  (no .dev.vars file yet: copy .dev.vars.example to .dev.vars and fill it in)');
    console.log(`  Supabase must allow this address: Authentication -> URL Configuration -> Redirect URLs: http://localhost:${port}/**`);
  });
}
module.exports = { createServer, parseVars, loadEnv, headersFor, fileFor };
