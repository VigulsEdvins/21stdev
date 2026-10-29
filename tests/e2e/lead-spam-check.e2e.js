/** The spam check on the contact page and the start questions: shown only when the site has a key, waited for, sent with the message, reset after a refusal. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

const WIDGET = (tokens) => `window.turnstile={n:0,render:function(el,o){el.setAttribute('data-widget','1');var t=${JSON.stringify(tokens)},i=window.turnstile.n++;setTimeout(function(){o.callback(t[Math.min(i,t.length-1)]);},250);return 'w'+i;},reset:function(){var t=${JSON.stringify(tokens)};window.turnstile.resets=(window.turnstile.resets||0)+1;var o=window.__opts;setTimeout(function(){window.__cb&&window.__cb(t[Math.min(window.turnstile.n++,t.length-1)]);},250);}};`;

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const errors = [];
  console.log('Spam check on the lead forms');

  async function open(path, { key, tokens = ['tok-1', 'tok-2'], blockScript = false, leadStatuses = [200] }) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    const seen = { script: 0, leads: [] };
    await page.route('**/api/form-check', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(key ? { turnstileSiteKey: key } : {}) }));
    await page.route('https://challenges.cloudflare.com/**', (r) => { seen.script++; if (blockScript) return r.abort(); // the stand-in widget keeps its callback so reset() can issue the next token
      return r.fulfill({ status: 200, contentType: 'text/javascript', body: WIDGET(tokens).replace('return \'w\'+i;', "window.__cb=o.callback;return 'w'+i;") }); });
    await page.route('**/api/lead', async (r) => { seen.leads.push(JSON.parse(r.request().postData())); const st = leadStatuses[Math.min(seen.leads.length - 1, leadStatuses.length - 1)]; await r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify({ ok: st === 200 }) }); });
    await page.goto(srv.url + path);
    return { page, seen, ctx };
  }
  const fillContact = async (page) => { await page.fill('#k-email', 'ada@example.com'); await page.check('#k-consent'); };

  // ---------------------------------------------------------------- contact page, no key: as before
  let t = await open('/site/contact/index.html', { key: '' });
  await t.page.waitForSelector('#contact-form');
  await t.page.waitForTimeout(400);
  assert.strictEqual(await t.page.locator('#k-check').isHidden(), true, 'no widget without a key');
  assert.strictEqual(t.seen.script, 0, 'Cloudflare is not contacted without a key');
  await fillContact(t.page); await t.page.click('#contact-form button[type=submit]');
  await t.page.waitForSelector('.alert--ok');
  assert.strictEqual(t.seen.leads.length, 1); assert(!('turnstile' in t.seen.leads[0]), 'no token field without a key');
  await t.ctx.close();
  console.log('  ✓ contact page without a key: no widget, no Cloudflare call, message sent as before');

  // ---------------------------------------------------------------- contact page, with key
  t = await open('/site/contact/index.html', { key: 'site-key-test', leadStatuses: [403, 200] });
  await t.page.waitForSelector('#k-check[data-widget="1"]', { state: 'attached' });
  assert.strictEqual(await t.page.getAttribute('#k-check', 'hidden'), null, 'the widget is shown');
  await fillContact(t.page);
  await t.page.click('#contact-form button[type=submit]'); // before the check has finished
  assert(/wait for the spam check/i.test(await t.page.textContent('#contact-result')), 'asks to wait');
  assert.strictEqual(t.seen.leads.length, 0, 'nothing is sent before the check passes');
  await t.page.waitForTimeout(500);
  await t.page.click('#contact-form button[type=submit]');
  await t.page.waitForSelector('.alert--error'); // the Worker refuses (stand-in answer 403)
  assert.strictEqual(t.seen.leads[0].turnstile, 'tok-1', 'the token goes with the message');
  await t.page.waitForTimeout(600); // reset() gives a fresh token
  await t.page.click('#contact-form button[type=submit]');
  await t.page.waitForSelector('.alert--ok');
  assert.strictEqual(t.seen.leads[1].turnstile, 'tok-2', 'after a refusal the check starts again and the next token is used');
  await t.ctx.close();
  console.log('  ✓ contact page with a key: widget shown, send waits for it, token sent, fresh token after a refusal');

  // ---------------------------------------------------------------- the check script cannot load
  t = await open('/site/contact/index.html', { key: 'site-key-test', blockScript: true });
  await t.page.waitForTimeout(700);
  await fillContact(t.page); await t.page.click('#contact-form button[type=submit]');
  assert(/did not load/i.test(await t.page.textContent('#contact-result')), 'says so');
  assert.strictEqual(t.seen.leads.length, 0, 'sends nothing that would be refused');
  await t.ctx.close();
  console.log('  ✓ a blocked check script is explained and nothing is sent');

  // ---------------------------------------------------------------- start questions
  t = await open('/site/start/index.html#contact', { key: 'site-key-test' });
  await t.page.waitForSelector('#c-check[data-widget="1"]', { state: 'attached' });
  assert.strictEqual(await t.page.getAttribute('#c-check', 'hidden'), null, 'the widget is shown on the start page');
  await t.page.fill('#c-email', 'ada@example.com'); await t.page.check('#c-consent');
  await t.page.click('form button[type=submit]');
  assert(/wait for the spam check/i.test(await t.page.textContent('#c-cerr')), 'start page waits for the check too');
  assert.strictEqual(t.seen.leads.length, 0);
  await t.page.waitForTimeout(500);
  await t.page.click('form button[type=submit]');
  await t.page.waitForFunction(() => /Thank you|Sent/.test(document.body.textContent));
  assert.strictEqual(t.seen.leads[0].turnstile, 'tok-1', 'the start page sends the token');
  await t.ctx.close();
  t = await open('/site/start/index.html#contact', { key: '' });
  await t.page.waitForSelector('#c-email');
  await t.page.waitForTimeout(400);
  assert.notStrictEqual(await t.page.getAttribute('#c-check', 'hidden'), null, 'no widget without a key');
  await t.page.fill('#c-email', 'ada@example.com'); await t.page.check('#c-consent'); await t.page.click('form button[type=submit]');
  await t.page.waitForFunction(() => /Thank you|Sent/.test(document.body.textContent));
  assert(!('turnstile' in t.seen.leads[0]));
  await t.ctx.close();
  console.log('  ✓ start questions: same behaviour, with and without a key');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  await browser.close();
  await srv.close();
  console.log('✅ Spam check on the lead forms passed!');
})().catch((e) => { console.error(e); process.exit(1); });
