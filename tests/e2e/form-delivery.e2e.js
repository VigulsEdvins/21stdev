/** Form delivery in an exported site: Netlify, WhatsApp and email-app routes send what the visitor typed, and only then. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const A = require('../../scripts/assembler.js');
const { launchBrowser } = require('../../scripts/lib/browser');

const read = (slug, f) => fs.readFileSync(path.join(__dirname, '..', '..', 'features', slug, f), 'utf8');
const sections = ['contact-form-validated', 'waitlist-hero', 'multi-step-form'].map((slug, i) => ({ id: 's' + i, slug, title: slug, html: read(slug, 'index.html'), css: read(slug, 'style.css'), js: read(slug, 'script.js') }));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };

function serve(dir, state) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => { state.posts.push({ url: req.url, type: req.headers['content-type'], body: new URLSearchParams(body) }); res.writeHead(state.status); res.end(); });
        return;
      }
      const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
      if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function fillContact(page) {
  const f = page.locator('#s0 form');
  await f.locator('input[name=name]').fill('Ada Lovelace');
  await f.locator('input[name=email]').fill('ada@example.com');
  await f.locator('textarea[name=message]').fill('Hello, I need a website for my shop.');
}

(async () => {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { window.__edvMinFillMs = 0; }); // the timing check has its own test below; the others fill at machine speed
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'form-delivery-'));
  const write = (bundle) => { for (const [n, c] of Object.entries(bundle)) { fs.mkdirSync(path.dirname(path.join(dir, n)), { recursive: true }); fs.writeFileSync(path.join(dir, n), c); } };
  const bundle = (page, extra = {}) => A.generateExportBundle(sections, { id: 'clean-minimal' }, {}, { page: { title: 'Zephyr dental', ...page }, ...extra });

  // ---------------------------------------------------------------- Netlify, under the strict policy
  console.log('Netlify Forms');
  const state = { posts: [], status: 200 };
  write(bundle({ formMethod: 'netlify' }, { csp: true }));
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert((html.match(/data-netlify="true"/g) || []).length === 3, 'three message forms are marked for Netlify');
  assert(/<input type="hidden" name="form-name" value="owForm">/.test(html), 'Netlify form-name field present');
  const names = [...html.matchAll(/data-netlify="true"/g)].length;
  assert.strictEqual(names, 3);
  let srv = await serve(dir, state);
  let base = `http://127.0.0.1:${srv.address().port}`;
  let page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(base + '/');
  await page.waitForSelector('#s0 form');

  await page.locator('#s0 form button[type=submit]').click(); // empty: the block's own checks refuse it
  await page.waitForTimeout(300);
  assert.strictEqual(state.posts.length, 0, 'an invalid submit sends nothing');

  await fillContact(page);
  await page.locator('#s0 form button[type=submit]').click();
  await page.waitForFunction(() => !document.querySelector('#s0 .cfv-success').hidden);
  await page.waitForFunction(() => true);
  await page.waitForTimeout(300);
  assert.strictEqual(state.posts.length, 1, 'one message sent');
  const p = state.posts[0];
  assert.strictEqual(p.url, '/');
  assert(/x-www-form-urlencoded/.test(p.type));
  assert.strictEqual(p.body.get('form-name'), 'form-1');
  assert.strictEqual(p.body.get('name'), 'Ada Lovelace');
  assert.strictEqual(p.body.get('email'), 'ada@example.com');
  assert.strictEqual(p.body.get('message'), 'Hello, I need a website for my shop.');
  assert(!p.body.has('bot-field'), 'the trap field is not sent');
  console.log('  ✓ contact form posts its fields to the site');

  // newsletter-style block: unnamed email input gets the name "email"
  await page.locator('#s1 input[type=email]').fill('grace@example.com');
  await page.locator('#s1 button[type=submit]').click();
  await page.waitForTimeout(400);
  assert.strictEqual(state.posts.length, 2);
  assert.strictEqual(state.posts[1].body.get('email'), 'grace@example.com');
  console.log('  ✓ waitlist form posts its email');

  // multi-step: only the last step sends, and it carries every step's answers
  const multi = page.locator('#s2 form');
  await multi.locator('[data-key=name]').fill('Linus');
  await multi.locator('[data-key=email]').fill('linus@example.com');
  await multi.locator('button[type=submit]').click();
  await multi.locator('[data-key=type]').selectOption({ label: 'Branding' });
  await multi.locator('button[type=submit]').click();
  await page.waitForTimeout(300);
  assert.strictEqual(state.posts.length, 2, 'nothing is sent before the last step');
  await multi.locator('button[type=submit]').click();
  await page.waitForTimeout(400);
  assert.strictEqual(state.posts.length, 3);
  const m = state.posts[2].body;
  assert.deepStrictEqual([m.get('name'), m.get('email'), m.get('type'), m.get('budget')], ['Linus', 'linus@example.com', 'Branding', 'Under 5,000']);
  console.log('  ✓ multi-step form sends once, at the end, with all answers');

  // a bot filling the trap field gets a normal-looking page and no message
  await page.reload();
  await fillContact(page);
  await page.evaluate(() => { document.querySelector('#s0 [name=bot-field]').value = 'spam'; });
  await page.locator('#s0 form button[type=submit]').click();
  await page.waitForTimeout(400);
  assert.strictEqual(state.posts.length, 3, 'trap field filled: nothing sent');
  console.log('  ✓ trap field stops bots');

  // a failing receiver (a host that is not Netlify) is reported to the visitor
  state.status = 405;
  await page.reload();
  await fillContact(page);
  await page.locator('#s0 form button[type=submit]').click();
  await page.waitForSelector('#s0 [data-edv-notice]');
  assert(/could not be sent/i.test(await page.locator('[data-edv-notice]').first().textContent()));
  assert.deepStrictEqual(problems, [], 'no policy violations or errors: ' + problems.join(' | '));
  console.log('  ✓ failure is shown, and the strict policy is respected');
  srv.close();

  // ---------------------------------------------------------------- WhatsApp and email app
  console.log('WhatsApp and email app');
  for (const [method, target] of [['whatsapp', '+371 2000 0000'], ['mailto', 'owner@zephyr.example']]) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir);
    const st = { posts: [], status: 200 };
    write(bundle({ formMethod: method, formTarget: target }));
    srv = await serve(dir, st);
    page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__opened = [];
      window.open = (u) => { window.__opened.push(u); return {}; };
      document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href^="mailto:"]'); if (a) { window.__opened.push(a.href); e.preventDefault(); } }, true);
    });
    await page.goto(`http://127.0.0.1:${srv.address().port}/`);
    await page.waitForSelector('#s0 form');
    await fillContact(page);
    await page.locator('#s0 form button[type=submit]').click();
    await page.waitForTimeout(300);
    const opened = await page.evaluate(() => window.__opened);
    assert.strictEqual(opened.length, 1, method + ' opened once');
    const url = new URL(opened[0]);
    if (method === 'whatsapp') {
      assert.strictEqual(opened[0].split('?')[0], 'https://wa.me/37120000000');
      assert(url.searchParams.get('text').includes('Email: ada@example.com') && url.searchParams.get('text').includes('Message: Hello'));
    } else {
      assert.strictEqual(url.protocol + url.pathname, 'mailto:owner@zephyr.example');
      assert(url.searchParams.get('subject').includes('Zephyr dental'));
      assert(url.searchParams.get('body').includes('Name: Ada Lovelace'));
    }
    assert.strictEqual(st.posts.length, 0, 'nothing posted to the site');
    console.log(`  ✓ ${method} link is built from the form`);
    srv.close();
    await page.close();
  }

  // ---------------------------------------------------------------- email and form services (stand-ins answer in the browser; the real services are never contacted)
  console.log('Email and form services');
  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
  const routes = [
    ['email', 'owner@zephyr.example', 'https://formsubmit.co/ajax/owner@zephyr.example', (d) => d._subject.includes('Zephyr dental') && d._template === 'table', { success: 'true' }, { success: 'false', message: 'not activated' }],
    ['formspree', 'abcdwxyz', 'https://formspree.io/f/abcdwxyz', (d) => d._subject.includes('Zephyr dental'), { ok: true }, { errors: [{ message: 'bad' }] }],
    ['web3forms', '12345678-abcd-1234-abcd-1234567890ab', 'https://api.web3forms.com/submit', (d) => d.access_key === '12345678-abcd-1234-abcd-1234567890ab' && d.subject.includes('Zephyr dental'), { success: true }, { success: false, message: 'bad key' }],
    ['custom', 'https://api.example.test/contact', 'https://api.example.test/contact', (d) => !('_subject' in d) && !('access_key' in d), {}, {}]
  ];
  for (const [method, target, expectUrl, extraOk, okBody, badBody] of routes) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir);
    const st = { posts: [], status: 200 };
    write(bundle({ formMethod: method, formTarget: target }, { csp: true }));
    const site = await serve(dir, st);
    const pg = await ctx.newPage();
    const seen = [];
    let answer = { status: 200, body: okBody };
    await pg.route(/^https:\/\/(formsubmit\.co|formspree\.io|api\.web3forms\.com|api\.example\.test)\//, (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      seen.push({ url: req.url(), type: req.headers()['content-type'], accept: req.headers().accept, data: JSON.parse(req.postData() || '{}') });
      return route.fulfill({ status: answer.status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(answer.body) });
    });
    const issues = [];
    pg.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) issues.push(m.text()); });
    await pg.goto(`http://127.0.0.1:${site.address().port}/`);
    await pg.waitForSelector('#s0 form');
    await fillContact(pg);
    await pg.locator('#s0 form button[type=submit]').click();
    await pg.waitForFunction(() => !document.querySelector('#s0 .cfv-success').hidden);
    await pg.waitForTimeout(400);
    assert.strictEqual(seen.length, 1, method + ': one request');
    assert.strictEqual(seen[0].url, expectUrl);
    assert(/application\/json/.test(seen[0].type) && /application\/json/.test(seen[0].accept));
    assert.deepStrictEqual([seen[0].data.name, seen[0].data.email, seen[0].data.message], ['Ada Lovelace', 'ada@example.com', 'Hello, I need a website for my shop.']);
    assert(!('bot-field' in seen[0].data) && !('form-name' in seen[0].data), 'no helper fields sent');
    assert(extraOk(seen[0].data), method + ': service fields');
    assert.strictEqual(await pg.locator('[data-edv-notice]').count(), 0, method + ': no failure notice on success');
    assert.strictEqual(st.posts.length, 0, 'nothing posted to the site itself');
    // the service refuses: the visitor is told
    if (method !== 'custom') {
      answer = { status: method === 'web3forms' || method === 'email' ? 200 : 422, body: badBody };
      await pg.reload();
      await fillContact(pg);
      await pg.locator('#s0 form button[type=submit]').click();
      await pg.waitForSelector('#s0 [data-edv-notice]');
    } else {
      answer = { status: 500, body: {} };
      await pg.reload();
      await fillContact(pg);
      await pg.locator('#s0 form button[type=submit]').click();
      await pg.waitForSelector('#s0 [data-edv-notice]');
    }
    assert.deepStrictEqual(issues, [], method + ': no policy violations: ' + issues.join(' | '));
    console.log(`  ✓ ${method}: right request, refusal shown, strict policy respected`);
    site.close();
    await pg.close();
  }

  // ---------------------------------------------------------------- timing: instant = bot (dropped), early = held, later = sent at once
  console.log('Timing check');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  const st3 = { posts: [], status: 200 };
  write(bundle({ formMethod: 'netlify' }));
  srv = await serve(dir, st3);
  const slowCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await slowCtx.addInitScript(() => { window.__edvDropMs = 1500; window.__edvMinFillMs = 3500; }); // the real rule is 0.8 s and 2.5 s; wider here so the test cannot flake
  const open3 = async () => {
    const pg = await slowCtx.newPage();
    await pg.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: 'domcontentloaded' });
    await pg.waitForSelector('#s0 form');
    return pg;
  };
  const sendNow = async (pg) => pg.evaluate(() => {
    const f = document.querySelector('#s0 form');
    f.querySelector('[name=name]').value = 'Ada';
    f.querySelector('[name=email]').value = 'ada@example.com';
    f.querySelector('[name=message]').value = 'Hello, I need a website.';
    f.querySelector('button[type=submit]').click();
  });
  page = await open3();
  await sendNow(page); // instantly
  await page.waitForTimeout(4200);
  assert.strictEqual(st3.posts.length, 0, 'sent instantly: dropped, never delivered');
  await page.close();
  page = await open3();
  await page.waitForTimeout(2000);
  await sendNow(page); // a person who was quick: held, not lost
  await page.waitForTimeout(500);
  assert.strictEqual(st3.posts.length, 0, 'still held');
  await page.waitForFunction(() => true);
  await page.waitForTimeout(2500);
  assert.strictEqual(st3.posts.length, 1, 'held message is delivered once the wait is over');
  await page.close();
  page = await open3();
  await page.waitForTimeout(3700);
  await sendNow(page);
  await page.waitForTimeout(600);
  assert.strictEqual(st3.posts.length, 2, 'after the wait: delivered at once');
  console.log('  ✓ instant = dropped, early = held then delivered, later = delivered at once');
  srv.close();
  await slowCtx.close();

  // ---------------------------------------------------------------- builder preview
  console.log('Builder preview');
  for (const [formMethod, formTarget, expectNote] of [['whatsapp', '+371 2000 0000', true], ['', '', false]]) {
    const pv = await ctx.newPage();
    await pv.addInitScript(() => { window.open = (u) => { window.__opened = (window.__opened || []).concat(u); return {}; }; });
    await pv.setContent(A.assemblePreviewDocument(sections, { id: 'clean-minimal' }, {}, { page: { title: 'Zephyr dental', formMethod, formTarget }, formNote: true }));
    await pv.waitForSelector('#s0 form');
    await fillContact(pv);
    await pv.locator('#s0 form button[type=submit]').click();
    await pv.waitForFunction(() => !document.querySelector('#s0 .cfv-success').hidden);
    await pv.waitForTimeout(200);
    assert.strictEqual(await pv.locator('[data-edv-preview-note]').count(), expectNote ? 1 : 0, 'preview note for "' + formMethod + '"');
    if (expectNote) assert(/not sent/.test(await pv.locator('[data-edv-preview-note]').textContent()));
    assert.strictEqual(await pv.evaluate(() => (window.__opened || []).length), 0, 'the preview opens nothing');
    await pv.close();
  }
  console.log('  ✓ the preview says it did not send, and sends nothing');

  // ---------------------------------------------------------------- single file

  console.log('Single file');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'index.html'), A.generateSingleFileBundle(sections, { id: 'clean-minimal' }, {}, { page: { title: 'Zephyr dental', formMethod: 'netlify' } }));
  const st2 = { posts: [], status: 200 };
  srv = await serve(dir, st2);
  page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${srv.address().port}/`);
  await page.waitForSelector('#s0 form');
  await fillContact(page);
  await page.locator('#s0 form button[type=submit]').click();
  await page.waitForTimeout(400);
  assert.strictEqual(st2.posts.length, 1);
  assert.strictEqual(st2.posts[0].body.get('email'), 'ada@example.com');
  console.log('  ✓ the all-in-one file sends too');
  srv.close();

  await browser.close();
  console.log('✅ Form delivery export flow passed!');
})().catch((e) => { console.error(e); process.exit(1); });
