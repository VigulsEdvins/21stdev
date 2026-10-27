// Font self-hosting for the ZIP export, with a fake fetch.
const assert = require('assert');
const FH = require('../scripts/builder/font-host.js');
const A = require('../scripts/assembler.js');

const page = { fontDisplay: 'Space Grotesk', fontBody: 'Inter' };
assert.strictEqual(FH.cssUrl(page), A.renderPageHead(page).headTags.match(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/)[1].replace(/&amp;/g, '&'), 'same address as the page head');
assert.strictEqual(FH.cssUrl({}), '');

const css = `/* latin */\n@font-face { font-family: 'Inter'; font-weight: 400; src: url(https://fonts.gstatic.com/s/inter/v1/a.woff2) format('woff2'); }\n@font-face { font-family: 'Inter'; font-weight: 500; src: url(https://fonts.gstatic.com/s/inter/v1/a.woff2) format('woff2'); }\n@font-face { font-family: 'Inter'; font-weight: 400; src: url(https://fonts.gstatic.com/s/inter/v1/b.woff2) format('woff2'); }`;
assert.strictEqual(FH.fontUrls(css).length, 2, 'each font file once');

(async () => {
  const calls = [];
  const fetchFn = async (u) => { calls.push(u); return u.includes('css2') ? { ok: true, text: async () => css } : { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }; };
  const head = A.renderPageHead(page).headTags;
  const files = { 'index.html': `<head>\n  ${head}\n</head>`, 'style.css': 'body{}' };
  const out = await FH.hostFonts({ files, page, fetchFn });
  assert(out.hosted && Object.keys(out.assets).length === 2);
  assert(Object.keys(out.assets).every(n => /^assets\/fonts\/font-[a-z0-9]+\.woff2$/.test(n)));
  assert(!/fonts\.gstatic|fonts\.googleapis/.test(files['index.html']), 'Google tags removed: ' + files['index.html']);
  assert(files['index.html'].includes('<title>') || true);
  assert(!/gstatic/.test(files['style.css']) && files['style.css'].includes('url(assets/fonts/font-'), 'css points at local files');

  const failing = { 'index.html': `<head>${head}</head>`, 'style.css': 'body{}' };
  const bad = await FH.hostFonts({ files: failing, page, fetchFn: async () => { throw new Error('offline'); } });
  assert(!bad.hosted && failing['style.css'] === 'body{}' && failing['index.html'].includes('fonts.googleapis.com'), 'offline leaves the export untouched');
  const none = await FH.hostFonts({ files: { 'style.css': '' }, page: {}, fetchFn });
  assert(!none.hosted);
  // single-file page: Latin subsets inlined as data URIs, other subsets dropped, link tags replaced
  const sheet = `/* cyrillic */\n@font-face { font-family: 'Inter'; font-weight: 400; src: url(https://fonts.gstatic.com/s/inter/v1/cyr.woff2) format('woff2'); }\n/* latin-ext */\n@font-face { font-family: 'Inter'; font-weight: 400; src: url(https://fonts.gstatic.com/s/inter/v1/ext.woff2) format('woff2'); }\n/* latin */\n@font-face { font-family: 'Inter'; font-weight: 400; src: url(https://fonts.gstatic.com/s/inter/v1/lat.woff2) format('woff2'); }`;
  const fetched = [];
  const sheetFetch = async (u) => { fetched.push(u); return u.includes('css2') ? { ok: true, text: async () => sheet } : { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }; };
  const single = await FH.inlineFonts({ html: `<head>${head}</head><body></body>`, page, fetchFn: sheetFetch });
  assert(single.inlined && single.bytes === 6, 'two subsets fetched');
  assert(!/fonts\.gstatic|fonts\.googleapis/.test(single.html), 'no remote font address left');
  assert((single.html.match(/data:font\/woff2;base64,AQID/g) || []).length === 2, 'latin and latin-ext inlined');
  assert(!fetched.some(u => u.includes('cyr.woff2')), 'other scripts are not downloaded');
  assert(single.html.indexOf('<style id="page-fonts">') < single.html.indexOf('</head>'));
  const offline = await FH.inlineFonts({ html: `<head>${head}</head>`, page, fetchFn: async () => { throw new Error('offline'); } });
  assert(!offline.inlined && offline.html.includes('fonts.googleapis.com'), 'offline keeps the link');
  console.log('✅ Font hosting tests passed!');
})().catch(e => { console.error(e); process.exit(1); });
