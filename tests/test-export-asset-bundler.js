const assert = require('assert');
const assembler = require('../scripts/assembler.js');
const { createAssetBundler, bytesToDataUri } = require('../scripts/builder/export-assets.js');

(async () => {
  console.log('Testing export asset bundler...');

  const png = new Uint8Array([137, 80, 78, 71]);
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (url === '/assets/library/a-1.png') return { ok: true, arrayBuffer: async () => png.buffer };
    if (url === '/assets/library/space%20name.jpg') return { ok: true, arrayBuffer: async () => png.buffer };
    return { ok: false };
  };
  const bundler = createAssetBundler({ assembler, fetchFn });

  const files = {
    'index.html': '<img src="/assets/library/a-1.png"><img src="/assets/library/missing.png">',
    'style.css': ".x{background:url('/assets/library/a-1.png')}",
    'script.js': 'const u = "/assets/library/space%20name.jpg";',
    'README.md': 'untouched /assets/library/a-1.png'
  };
  const single = '<img src="/assets/library/a-1.png">';
  const out = await bundler.bundle({ files, singleHtml: single });

  assert.deepStrictEqual(out.missing, ['/assets/library/missing.png']);
  assert(out.files['index.html'].includes('src="assets/library/a-1.png"'), 'zip html rewritten');
  assert(out.files['index.html'].includes('/assets/library/missing.png'), 'missing asset left untouched');
  assert(out.files['style.css'].includes("url('assets/library/a-1.png')"), 'css rewritten');
  assert(out.files['script.js'].includes('assets/library/space name.jpg'), 'decoded file name in zip path');
  assert.strictEqual(out.files['README.md'], 'untouched /assets/library/a-1.png');
  assert(Object.keys(out.assets).includes('assets/library/a-1.png'));
  assert.strictEqual(out.assets['assets/library/a-1.png'].length, 4);
  assert(out.singleHtml.startsWith('<img src="data:image/png;base64,iVBORw=='), 'single file inlines data URI');
  assert.strictEqual(calls.filter(u => u === '/assets/library/a-1.png').length, 1, 'each asset is fetched once');

  // no assets -> no work
  // paths outside /assets/ are moved under assets/
  const other = await createAssetBundler({ assembler, fetchFn: async () => ({ ok: true, arrayBuffer: async () => png.buffer }) })
    .bundle({ files: { 'index.html': '<img src="/vivmgmt/a.jpg">' }, singleHtml: '' });
  assert(other.files['index.html'].includes('src="assets/vivmgmt/a.jpg"'));
  assert(Object.keys(other.assets).includes('assets/vivmgmt/a.jpg'));

  // a stylesheet brings its fonts along: shipped beside it in the ZIP, inlined for the single file
  const woff = new Uint8Array([119, 79, 70, 50]);
  const cssText = "@font-face{font-family:X;src:url(font-1.woff2) format('woff2')}";
  const cssFetch = async (url) => {
    if (url === '/assets/library/fonts-x.css') return { ok: true, arrayBuffer: async () => new TextEncoder().encode(cssText).buffer };
    if (url === '/assets/library/font-1.woff2') return { ok: true, arrayBuffer: async () => woff.buffer };
    return { ok: false };
  };
  const fontOut = await createAssetBundler({ assembler, fetchFn: cssFetch })
    .bundle({ files: { 'index.html': '', 'style.css': '', 'script.js': 'link.href="/assets/library/fonts-x.css"' }, singleHtml: '<script>link.href="/assets/library/fonts-x.css"</script>' });
  assert.deepStrictEqual(fontOut.missing, []);
  assert(fontOut.files['script.js'].includes('"assets/library/fonts-x.css"'), 'stylesheet path rewritten');
  assert(Object.keys(fontOut.assets).includes('assets/library/fonts-x.css'), 'stylesheet in the ZIP');
  assert(Object.keys(fontOut.assets).includes('assets/library/font-1.woff2'), 'its font in the ZIP');
  const inlinedCss = Buffer.from(fontOut.singleHtml.match(/data:text\/css;base64,([A-Za-z0-9+\/=]+)/)[1], 'base64').toString();
  assert(inlinedCss.includes('data:font/woff2;base64,') && !inlinedCss.includes('font-1.woff2'), 'single file inlines the font inside the stylesheet');

  const none = await bundler.bundle({ files: { 'index.html': '<p>hi</p>' }, singleHtml: '<p>hi</p>' });
  assert.deepStrictEqual(none.assets, {});

  assert.strictEqual(bytesToDataUri(new Uint8Array([72, 105]), 'text/plain'), 'data:text/plain;base64,SGk=');
  console.log('✅ Export asset bundler tests passed!');
})().catch(e => { console.error(e); process.exit(1); });
