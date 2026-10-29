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
    const t = raw.trim();
    if (t.startsWith('!')) { (out[cur]['!detach'] = out[cur]['!detach'] || []).push(t.slice(1).trim().toLowerCase()); continue; } // "! Header": drop what earlier rules set
    const i = raw.indexOf(':'); out[cur][raw.slice(0, i).trim().toLowerCase()] = raw.slice(i + 1).trim();
  }
  return out;
}
/** The headers a path really gets: the rules that match, in file order, with "!" removing what came before. */
function effective(rules, rulePath) {
  const h = Object.assign({}, rules['/*']);
  const gone = (rules[rulePath] || {})['!detach'] || [];
  gone.forEach((n) => { delete h[n]; });
  for (const [k, v] of Object.entries(rules[rulePath] || {})) if (k !== '!detach') h[k] = v;
  return h;
}
function parseCsp(value) { const m = {}; for (const part of value.split(';')) { const [k, ...v] = part.trim().split(/\s+/); if (k) m[k.toLowerCase()] = v; } return m; }

/** Returns a list of problems with a header set (keys lowercase). */
function problems(h, { strictStyles = true, frameAncestors = ["'none'"] } = {}) {
  const errs = [];
  for (const k of REQUIRED) if (!h[k]) errs.push('missing header: ' + k);
  if (h['content-security-policy']) {
    const c = parseCsp(h['content-security-policy']);
    const must = Object.assign({}, CSP_MUST, { 'frame-ancestors': frameAncestors });
    for (const [d, want] of Object.entries(must)) if (JSON.stringify(c[d]) !== JSON.stringify(want)) errs.push(`CSP ${d} must be ${want.join(' ')}`);
    for (const d of ['img-src', 'media-src', 'font-src', 'connect-src', 'frame-src', 'style-src']) { const v = c[d] || []; for (const bad of ['*', 'https:', 'http:']) if (v.includes(bad)) errs.push(`CSP ${d} must not allow ${bad}`); }
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
    for (const p of ['/', '/pricing/', '/start/', '/account/', '/examples/yearbook/']) {
      const r = await fetch(new URL(p, arg), { redirect: 'follow' });
      const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
      errs = errs.concat(problems(h, p.startsWith('/examples/') ? { strictStyles: false, frameAncestors: ["'self'"] } : {}).map((e) => `${p}: ${e}`));
    }
  } else {
    const rules = parseHeaders(fs.readFileSync(path.join(__dirname, '..', 'site', '_headers'), 'utf8'));
    errs = problems(rules['/*'] || {}).map((e) => '/*: ' + e);
    if (rules['/style/*']) errs = errs.concat(problems(effective(rules, '/style/*'), { strictStyles: false }).map((e) => '/style/*: ' + e));
    for (const r of Object.keys(rules).filter((k) => /^\/examples\/[a-z]+\/\*$/.test(k))) {
      errs = errs.concat(problems(effective(rules, r), { strictStyles: false, frameAncestors: ["'self'"] }).map((e) => r + ': ' + e));
      if (!(rules[r]['!detach'] || []).includes('content-security-policy')) errs.push(r + ': must detach the strict policy first, or the browser applies both');
    }
    // a rule that sets its own Cache-Control must first remove the general one, or the browser receives both
    for (const [r, h] of Object.entries(rules)) if (r !== '/*' && h['cache-control'] && !(h['!detach'] || []).includes('cache-control')) errs.push(r + ': sets Cache-Control without removing the general one first ("! Cache-Control")');
    if (rules['/account/*']) {
      errs = errs.concat(problems(effective(rules, '/account/*')).map((e) => '/account/*: ' + e)); // as strict as everywhere, only connect-src names one more address
      const c = parseCsp(effective(rules, '/account/*')['content-security-policy'] || '');
      const extra = (c['connect-src'] || []).filter((x) => x !== "'self'");
      if (extra.length !== 1 || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(extra[0])) errs.push('/account/*: connect-src may add only the one Supabase address');
      const only = (d, host) => { const v = (c[d] || []).filter((x) => x !== "'self'"); return v.length === 0 || (v.length === 1 && v[0] === host); };
      if (!only('script-src', 'https://challenges.cloudflare.com')) errs.push('/account/*: script-src may add only https://challenges.cloudflare.com (the spam check)');
      if (!only('frame-src', 'https://challenges.cloudflare.com')) errs.push('/account/*: frame-src may only be https://challenges.cloudflare.com (the spam check)');
      if ((c['style-src'] || []).some((x) => x !== "'self'")) errs.push('/account/*: style-src must stay as strict as everywhere');
      if (!(rules['/account/*']['!detach'] || []).includes('content-security-policy')) errs.push('/account/*: must detach the strict policy first, or the browser applies both');
    }
    for (const r of ['/contact/*', '/start/*']) { // the lead forms: as strict as everywhere, only the spam check's own address is added to script-src and frame-src
      if (!rules[r]) { errs.push(r + ': missing; the page shows the spam check and needs its address in script-src and frame-src'); continue; }
      errs.push(...problems(effective(rules, r)).map((e) => r + ': ' + e));
      const c = parseCsp(effective(rules, r)['content-security-policy'] || '');
      const only = (d) => { const v = (c[d] || []).filter((x) => x !== "'self'"); return v.length === 0 || (v.length === 1 && v[0] === 'https://challenges.cloudflare.com'); };
      if (!only('script-src')) errs.push(r + ': script-src may add only https://challenges.cloudflare.com (the spam check)');
      if (!(c['frame-src'] || []).length || !(c['frame-src'] || []).every((x) => x === 'https://challenges.cloudflare.com')) errs.push(r + ': frame-src must be exactly https://challenges.cloudflare.com (the spam check)');
      if (JSON.stringify(c['connect-src']) !== JSON.stringify(["'self'"])) errs.push(r + ': connect-src must stay as strict as everywhere');
      if ((c['style-src'] || []).some((x) => x !== "'self'")) errs.push(r + ': style-src must stay as strict as everywhere');
      if (!(rules[r]['!detach'] || []).includes('content-security-policy')) errs.push(r + ': must detach the strict policy first, or the browser applies both');
    }
    if (rules['/builder/*']) { // the page's own policy tag applies; the header must still forbid framing and detach the strict policy first
      const b = rules['/builder/*'];
      if (!(b['!detach'] || []).includes('content-security-policy')) errs.push('/builder/*: must detach the strict policy first, or the browser applies both');
      if (!/frame-ancestors 'none'/.test(b['content-security-policy'] || '')) errs.push("/builder/*: must keep frame-ancestors 'none'");
    }
    if (rules['/builder/features/*']) { // the catalogue previews: framed by the same site only
      const f = rules['/builder/features/*'];
      if (!(f['!detach'] || []).includes('content-security-policy')) errs.push('/builder/features/*: must detach the framing ban of /builder/* first');
      if (!/^frame-ancestors 'self'$/.test((f['content-security-policy'] || '').trim())) errs.push("/builder/features/*: must be exactly frame-ancestors 'self'");
    } else if (rules['/builder/*']) errs.push('/builder/features/*: missing; the catalogue previews are framed by the builder and need frame-ancestors \'self\'');
    if (rules['/style/*'] && !(rules['/style/*']['!detach'] || []).includes('content-security-policy')) errs.push('/style/*: must detach the strict policy first, or the browser applies both');
  }
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  console.log('✓ headers: CSP without unsafe-inline or unsafe-eval for scripts, HSTS, nosniff, referrer, permissions, opener' + (arg ? ' (live: ' + arg + ')' : ''));
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { parseHeaders, parseCsp, problems, effective };
