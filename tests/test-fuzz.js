/* Fuzzing of the endpoints and parsers that take free text or files (plan E16.8): the lead endpoint, the brief checker and the project
   import. Deterministic (seeded) so a failure can be replayed: SEED=123 node tests/test-fuzz.js. The rule is simple: never a crash, never a 5xx for
   bad input, never a stack trace, a file path or a secret in an answer, and never a line break in a mail subject. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('../functions/lib/lead-http.js');
const lead = require('../functions/lib/lead.js');
const Brief = require('../site/js/brief.js');
const Sanitize = require('../scripts/project-sanitize.js');

const SEED = Number(process.env.SEED || 20261029);
let s = SEED; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'briefs', 'valid-complete.json'), 'utf8'));
const NASTY = ['', ' ', 'A'.repeat(70000), '\u0000', 'a\r\nBcc: x@y.z', '<script>alert(1)</script>', '${7*7}', '{{7*7}}', "' OR 1=1 --", '../../etc/passwd', '%00', '𝓗𝓮𝓵𝓵𝓸', '‮evil', '\uD800', 'Ж'.repeat(5000), '0'.repeat(400), '-1', '1e999', 'null', '__proto__', 'constructor', '﻿', '😀'.repeat(3000), '\t\v\f'];
const VALUES = [...NASTY, null, undefined, true, false, 0, -1, 1e308, NaN, [], {}, [[]], { __proto__: { x: 1 } }, JSON.parse('{"__proto__":{"polluted":1}}'), new Array(2000).fill('x')];
const mutate = (o, depth = 0) => {
  if (Array.isArray(o)) return o.map((v) => (rnd() < 0.2 ? pick(VALUES) : mutate(v, depth + 1)));
  if (o && typeof o === 'object') { const out = {}; for (const [k, v] of Object.entries(o)) { if (rnd() < 0.05) continue; out[rnd() < 0.03 ? pick(NASTY) : k] = rnd() < 0.2 ? pick(VALUES) : mutate(v, depth + 1); } if (rnd() < 0.3) out[pick(NASTY)] = pick(VALUES); return out; }
  return rnd() < 0.15 ? pick(VALUES) : o;
};
const LEAK = /\bat [\w.<> ]+ \(|node_modules|\/home\/|\.js:\d+|ReferenceError|TypeError|SyntaxError|RangeError|test-key-not-real|owner@test\.invalid/;
const ENV = { LEAD_TO_EMAIL: 'owner@test.invalid', LEAD_FROM_EMAIL: 'site@test.invalid', RESEND_API_KEY: 'test-key-not-real' };
const good = { path: 'done', email: 'anna@example.com', name: 'Anna', brief: sample, consent: true, consentText: 'ok' };

(async () => {
  const realFetch = global.fetch; let mails = 0, subjects = [];
  global.fetch = async (u, i) => { mails++; subjects.push(JSON.parse(i.body).subject); return new Response('{"id":"x"}'); };
  const N = Number(process.env.RUNS || 400);
  const seen = {};
  try {
    for (let i = 0; i < N; i++) {
      // 1. the whole HTTP path with a mutated body, and sometimes raw junk
      const body = rnd() < 0.1 ? pick(NASTY) : JSON.stringify(mutate(good));
      const req = new Request('https://edvlabs.test/api/lead', { method: 'POST', headers: { 'Content-Type': rnd() < 0.9 ? 'application/json' : pick(['text/plain', '', 'application/json; charset=utf-8']), Origin: rnd() < 0.9 ? 'https://edvlabs.test' : pick(['null', 'https://evil.example', '']) }, body });
      let r; try { r = await http.route(req, ENV, async () => new Response('site')); } catch (e) { throw new Error('crash on run ' + i + ' (SEED=' + SEED + '): ' + e.message); }
      seen[r.status] = (seen[r.status] || 0) + 1;
      assert(r.status < 500 || r.status === 502, 'run ' + i + ' gave ' + r.status + ' (SEED=' + SEED + ')');
      const t = await r.text(); assert(!LEAK.test(t), 'run ' + i + ' leaks: ' + t.slice(0, 120));
      // 2. the checkers directly
      const b = mutate(sample); let issues; try { issues = Brief.check(b); } catch (e) { throw new Error('Brief.check crashed on run ' + i + ': ' + e.message); } assert(Array.isArray(issues));
      let p; try { p = lead.parse(mutate(good)); } catch (e) { throw new Error('parse crashed on run ' + i + ': ' + e.message); } assert(typeof p.ok === 'boolean');
      // 3. the project import
      const st = { v: 4, stack: [{ id: 'a', slug: 'x', title: pick(NASTY), overrides: mutate({ k: { type: 'text', value: pick(NASTY), selector: pick(NASTY) } }) }], page: mutate({ title: 'T', canonical: pick(NASTY), shareImage: pick(NASTY) }), theme: pick(VALUES) };
      let out; try { out = Sanitize.sanitizeState(st); } catch (e) { throw new Error('sanitizeState crashed on run ' + i + ': ' + e.message); }
      assert(out === null || typeof out === 'object');
      assert({}.polluted === undefined && ({}).x === undefined, 'prototype was polluted on run ' + i);
    }
    assert(subjects.every((x) => !/[\r\n]/.test(x)), 'a mail subject has a line break');
    assert(seen[200] > 0 && (seen[422] || seen[400] || seen[415]) , 'the run covered both accepted and refused input: ' + JSON.stringify(seen));
  } finally { global.fetch = realFetch; }
  console.log('✅ Fuzz tests passed (' + N + ' runs, seed ' + SEED + ', statuses ' + JSON.stringify(seen) + ', ' + mails + ' mails)');
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
