#!/usr/bin/env node
/**
 * Report-only probe for the builder's Content-Security-Policy (plan E16.7). Loads builder.html from the local vault server with the
 * CANDIDATE policy added as Content-Security-Policy-Report-Only, walks the guided steps and the preview, and prints every violation grouped by
 * directive. It never fails the build by itself; docs/security/builder-csp.md records the result and the order of fixes.
 *   node scripts/check-builder-csp.js           print the report
 *   node scripts/check-builder-csp.js --json    machine-readable
 */
const { startServer, launchBrowser } = require('./lib/browser');

const CANDIDATE = "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: data: blob:; frame-src 'self' data: blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

(async () => {
  const srv = await startServer(); const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  await page.route('**/builder.html*', async (route) => { const res = await route.fetch(); await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy-report-only': CANDIDATE } }); });
  const seen = new Map();
  await page.exposeFunction('reportViolation', (v) => { const k = v.directive + ' | ' + v.blocked; seen.set(k, (seen.get(k) || 0) + 1); });
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => { if (e.disposition === 'report') window.reportViolation({ directive: e.effectiveDirective, blocked: (e.blockedURI || 'inline').replace(/^(https?:\/\/[^/]+).*/, '$1').slice(0, 60) + (e.sample ? ' [' + e.sample.slice(0, 40).replace(/\s+/g, ' ') + ']' : '') + ' in ' + (window === window.top ? 'the builder page' : 'a frame (' + (e.documentURI.startsWith('about:srcdoc') || e.documentURI.startsWith('http') && /srcdoc/.test(e.documentURI) ? 'preview' : e.documentURI.slice(-30)) + ')') }); }));
  await page.addInitScript(() => { try { localStorage.setItem('web_builder_mode', 'guided'); } catch (e) { /* blocked */ } });
  await page.goto(srv.url + '/builder.html?guided=1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500);
  for (const label of ['Next', 'Next', 'Next', 'Next']) { const b = page.getByRole('button', { name: label }).first(); if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(500); } }
  await page.waitForTimeout(1500);
  await browser.close(); await srv.close();
  const rows = [...seen].map(([k, n]) => { const [directive, blocked] = k.split(' | '); return { directive, blocked, count: n }; }).sort((a, b) => b.count - a.count);
  if (process.argv.includes('--json')) { console.log(JSON.stringify({ candidate: CANDIDATE, violations: rows }, null, 2)); return; }
  console.log('Candidate policy (report-only):\n  ' + CANDIDATE + '\n');
  const byDir = {}; rows.forEach((r) => { (byDir[r.directive] = byDir[r.directive] || []).push(r); });
  for (const [d, list] of Object.entries(byDir)) { console.log(d + ': ' + list.reduce((t, r) => t + r.count, 0) + ' violation(s)'); list.slice(0, 8).forEach((r) => console.log('   ' + r.count + 'x ' + r.blocked)); }
  if (!rows.length) console.log('No violations: the candidate policy can be enforced.');
})().catch((e) => { console.error(e); process.exit(1); });
