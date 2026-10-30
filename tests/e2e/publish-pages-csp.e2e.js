/** Publishing forces the page security policy on: the single page, and every page of a multi-page site, carry it; the editor stays out. Uses the builder's own file collection (what "Put it online" sends). */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderExport && window.builderManager && window.builderManager.getStack().length > 0);
  console.log('Publishing and the page security policy');

  const csp = (html) => ((/http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html) || [])[1] || '').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); // the attribute is HTML-escaped
  const one = await page.evaluate(async () => { const c = await window.builderExport.collectFiles({ cms: false, csp: true }); return Object.fromEntries(Object.entries(c.files)); });
  assert(csp(one['index.html']), 'single page: the policy is in index.html');
  assert(/object-src 'none'/.test(csp(one['index.html'])));
  assert(!Object.keys(one).some((n) => /^(admin|cms)/.test(n)), 'no editor files: ' + Object.keys(one).join(', '));
  console.log('  ✓ one page carries its policy; no editor files');

  const off = await page.evaluate(async () => { const c = await window.builderExport.collectFiles({ cms: false, csp: false }); return c.files['index.html']; });
  assert(!csp(off), 'csp: false still turns it off (the download keeps following its own checkbox)');
  const follow = await page.evaluate(async () => { const c = await window.builderExport.collectFiles({ cms: false }); return c.files['index.html']; });
  assert(!csp(follow), 'with no option the checkbox decides, and it is off by default');
  console.log('  ✓ the download still follows its checkbox; only publishing forces it');

  const multi = await page.evaluate(async () => {
    const sm = window.builderManager; sm.addPage('About us'); sm.addSection('beam-wordmark-footer');
    const c = await window.builderExport.collectFiles({ cms: false, csp: true });
    return { pages: Object.keys(c.files).filter((n) => /\.html$/.test(n)), html: Object.fromEntries(Object.entries(c.files).filter(([n]) => /\.html$/.test(n))) };
  });
  const pages = multi.pages.filter((n) => !/^(404|DEPLOY)/.test(n));
  assert(pages.length >= 2, 'two pages exported: ' + multi.pages.join(', '));
  for (const n of pages) assert(csp(multi.html[n]), n + ' carries its policy');
  console.log('  ✓ every page of a multi-page site carries its policy: ' + pages.join(', '));

  /* What the builder in the browser writes (including the form-sending code made from function sources) is accepted by the server's script check,
     which takes that text from the one made when the site is staged. */
  const fs = require('fs'), nodePath = require('path');
  const root = nodePath.join(__dirname, '..', '..');
  const checker = require('../../functions/lib/script-check.js').createScriptChecker({
    library: async (slug) => { try { return fs.readFileSync(nodePath.join(root, 'features', slug, 'script.js'), 'utf8'); } catch (e) { return null; } },
    exportAssets: async () => ({}), parts: async () => require('../../scripts/build-site.js').scriptParts()
  });
  for (const [label, page_] of [['no method chosen', {}], ['a form service chosen', { formMethod: 'formsubmit', formTarget: 'someone@example.com' }]]) {
    const text = await page.evaluate(async (settings) => {
      const sm = window.builderManager; sm.clearStack();
      ['responsive-burger-menu', 'contact-form-validated', 'beam-wordmark-footer'].forEach((sl) => sm.addSection(sl));
      sm.setPage(settings);
      return (await window.builderExport.collectFiles({ cms: false, csp: true })).files['script.js'];
    }, page_);
    assert(/Form messages: sends the form/.test(text), label + ': the page carries the form-sending code');
    const r = await checker.check(text);
    assert(r.ok, label + ': the server accepts what the browser wrote: ' + r.problem);
  }
  console.log('  ✓ a page with a contact form, as the browser writes it, passes the server\'s script check');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('Publishing and policy e2e ok');
})().catch((e) => { console.error(e); process.exit(1); });
