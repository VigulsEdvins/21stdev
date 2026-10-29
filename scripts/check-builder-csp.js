#!/usr/bin/env node
/**
 * Probe for the builder's Content-Security-Policy (plan E16.7). Loads builder.html from the local vault server with the policies from
 * site/_headers added as Content-Security-Policy-Report-Only (the builder page and, for preview-frame/, the frame's own policy), walks the guided steps and the preview, and prints every violation grouped by
 * directive. It never fails the build by itself; docs/security/builder-csp.md records the result and the order of fixes.
 *   node scripts/check-builder-csp.js           print the report
 *   node scripts/check-builder-csp.js --json    machine-readable
 */
const { startServer, launchBrowser } = require('./lib/browser');

const fs = require('fs');
const path = require('path');
const H = require('./check-headers.js');
// the policies the site really sends (site/_headers): the builder page, and the preview frame's own page
const RULES = H.parseHeaders(fs.readFileSync(path.join(__dirname, '..', 'site', '_headers'), 'utf8'));
const CANDIDATE = H.effective(RULES, '/builder/*')['content-security-policy'].replace('; upgrade-insecure-requests', '');
const FRAME = H.effective(RULES, '/builder/preview-frame/')['content-security-policy'].replace('; upgrade-insecure-requests', '');

(async () => {
  const srv = await startServer(); const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  await page.route('**/builder.html*', async (route) => { const res = await route.fetch(); await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy-report-only': CANDIDATE } }); });
  await page.route('**/preview-frame/*', async (route) => { const res = await route.fetch(); await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy-report-only': FRAME } }); });
  const seen = new Map();
  await page.exposeFunction('reportViolation', (v) => { const k = v.directive + ' | ' + v.blocked; seen.set(k, (seen.get(k) || 0) + 1); });
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => { if (e.disposition === 'report') window.reportViolation({ directive: e.effectiveDirective, blocked: (e.blockedURI || 'inline').replace(/^(https?:\/\/[^/]+).*/, '$1').slice(0, 60) + (e.sample ? ' [' + e.sample.slice(0, 40).replace(/\s+/g, ' ') + ']' : '') + ' in ' + (window === window.top ? 'the builder page' : 'a frame (' + (e.documentURI.startsWith('about:srcdoc') || e.documentURI.startsWith('http') && /srcdoc/.test(e.documentURI) ? 'preview' : e.documentURI.slice(-30)) + ')') }); }));
  await page.addInitScript(() => { try { localStorage.setItem('web_builder_mode', 'guided'); } catch (e) { /* blocked */ } });
  await page.goto(srv.url + '/builder.html?guided=1'); await page.waitForLoadState('load'); await page.waitForTimeout(3000);
  for (const label of ['Next', 'Next', 'Next', 'Next']) { const b = page.getByRole('button', { name: label }).first(); if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(500); } }
  await page.waitForTimeout(1500);
  await browser.close(); await srv.close();
  const rows = [...seen].map(([k, n]) => { const [directive, blocked] = k.split(' | '); return { directive, blocked, count: n }; }).sort((a, b) => b.count - a.count);
  if (process.argv.includes('--json')) { console.log(JSON.stringify({ candidate: CANDIDATE, violations: rows }, null, 2)); return; }
  console.log('Builder page policy (from site/_headers, report-only here):\n  ' + CANDIDATE + '\n');
  const byDir = {}; rows.forEach((r) => { (byDir[r.directive] = byDir[r.directive] || []).push(r); });
  for (const [d, list] of Object.entries(byDir)) { console.log(d + ': ' + list.reduce((t, r) => t + r.count, 0) + ' violation(s)'); list.slice(0, 8).forEach((r) => console.log('   ' + r.count + 'x ' + r.blocked)); }
  if (!rows.length) console.log('No violations: the candidate policy can be enforced.');
})().catch((e) => { console.error(e); process.exit(1); });
