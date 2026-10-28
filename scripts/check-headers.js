#!/usr/bin/env node
// Checks the response headers of the public site.
//   npm run check-headers                         reads site/_headers and fails if a header is missing or weakened
//   npm run check-headers -- https://staging...   fetches the live address and checks the headers it really sends
const fs = require('fs');
const path = require('path');

const REQUIRED = ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy'];
const CSP_MUST = { 'default-src': ["'none'"], 'object-src': ["'none'"], 'base-uri': ["'none'"], 'frame-ancestors': ["'none'"] };

/** Parse a Cloudflare _headers file into { rule: { header(lowercase): value } }. */
function parseHeaders(text) {
  const out = {}; let cur = null;
  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) { cur = raw.trim(); out[cur] = out[cur] || {}; continue; }
    const i = raw.indexOf(':'); out[cur][raw.slice(0, i).trim().toLowerCase()] = raw.slice(i + 1).trim();
  }
  return out;
}
function parseCsp(value) { const m = {}; for (const part of value.split(';')) { const [k, ...v] = part.trim().split(/\s+/); if (k) m[k.toLowerCase()] = v; } return m; }

/** Returns a list of problems with a header set (keys lowercase). */
function problems(h, { strictStyles = true } = {}) {
  const errs = [];
  for (const k of REQUIRED) if (!h[k]) errs.push('missing header: ' + k);
  if (h['content-security-policy']) {
    const c = parseCsp(h['content-security-policy']);
    for (const [d, want] of Object.entries(CSP_MUST)) if (JSON.stringify(c[d]) !== JSON.stringify(want)) errs.push(`CSP ${d} must be ${want.join(' ')}`);
    for (const d of ['script-src', 'script-src-elem', 'script-src-attr']) {
      const v = c[d] || []; for (const bad of ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'http:', 'data:']) if (v.includes(bad)) errs.push(`CSP ${d} must not allow ${bad}`);
    }
    if (strictStyles && (c['style-src'] || []).includes("'unsafe-inline'")) errs.push("CSP style-src must not allow 'unsafe-inline'");
    if (!c['script-src']) errs.push('CSP needs a script-src');
  }
  if (h['x-content-type-options'] && h['x-content-type-options'].toLowerCase() !== 'nosniff') errs.push('x-content-type-options must be nosniff');
  if (h['strict-transport-security'] && !(Number((/max-age=(\d+)/.exec(h['strict-transport-security']) || [])[1]) >= 15552000)) errs.push('HSTS max-age must be at least 6 months');
  return errs;
}

async function main() {
  const arg = process.argv[2];
  let errs = [];
  if (arg) {
    for (const p of ['/', '/pricing/', '/start/']) {
      const r = await fetch(new URL(p, arg), { redirect: 'follow' });
      const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
      errs = errs.concat(problems(h).map((e) => `${p}: ${e}`));
    }
  } else {
    const rules = parseHeaders(fs.readFileSync(path.join(__dirname, '..', 'site', '_headers'), 'utf8'));
    errs = problems(rules['/*'] || {}).map((e) => '/*: ' + e);
    if (rules['/style/*']) errs = errs.concat(problems(Object.assign({}, rules['/*'], rules['/style/*']), { strictStyles: false }).map((e) => '/style/*: ' + e));
  }
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  console.log('✓ headers: CSP without unsafe-inline or unsafe-eval for scripts, HSTS, nosniff, referrer, permissions, opener' + (arg ? ' (live: ' + arg + ')' : ''));
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { parseHeaders, parseCsp, problems };
