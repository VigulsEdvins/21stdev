/* scripts/build-site.js: what is staged into dist/ for Cloudflare. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite, localAssets, cssDeps, stageBuilderPage } = require('../scripts/build-site.js');

assert.deepStrictEqual(localAssets('<link href="a.css"><script src="s/b.js?v=1"></script><script src="https://x.test/c.js"></script><a href="d.html"><link href="data:text/css,x">').sort(), ['a.css', 's/b.js']);
assert.deepStrictEqual(cssDeps('@import url("site/styles/tokens.css"); a{background:url(img/x.png)} b{src:url(data:font/woff2;base64,AA)} c{src:url(https://f.test/y.woff2)}', 'builder-e.css'), ['site/styles/tokens.css', 'img/x.png']);
assert.deepStrictEqual(cssDeps('src:url(../fonts/f.woff2)', 'site/styles/fonts.css'), ['site/fonts/f.woff2']);
const page = stageBuilderPage('<head></head><a href="index.html"><a href="index.html?mode=workbench"><a href="builder.html">');
assert(/href="\.\.\/"/.test(page) && !/index\.html/.test(page) && /href="\.\/"/.test(page) && /name="contact-url" content="\.\.\/contact\/"/.test(page), 'links and contact tag');
assert(/<meta name="access-gate" content="on"/.test(page), 'the staged page turns the free-blocks lock on');
assert(!/access-gate/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'builder.html'), 'utf8')), 'the repository copy of the page has no lock');
console.log('  ✓ page and stylesheet scanning, link rewrite, contact tag');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'edv-dist-'));
const { files } = buildSite({ out });
const has = (p) => fs.existsSync(path.join(out, p));
for (const p of ['index.html', 'account/index.html', '_headers', '404.html', 'builder/index.html', 'builder/preview-frame/index.html', 'builder/scripts/builder/frame-doc.js', 'builder/builder.js', 'builder/registry.js', 'builder/site/js/prices.js', 'builder/site/styles/tokens.css', 'builder/site/fonts', 'builder/features', 'builder/thumbs', 'assets/library'])
  assert(has(p), p + ' is staged');
for (const p of ['builder.html', 'node_modules', '.dev.vars', 'package.json', 'features', 'builder/package.json', 'builder/scripts/check-headers.js', 'builder/tests'])
  assert(!has(p), p + ' is not staged');
const walkAll = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkAll(path.join(d, e.name)) : [path.join(d, e.name)]));
const all = walkAll(out);
assert.strictEqual(all.length, files, 'the count matches');
assert(!all.some((f) => /\.(tsx|swp)$|\.dev\.vars|\.env/.test(f)), 'no sources or private files');
fs.rmSync(out, { recursive: true, force: true });
console.log('  ✓ dist has the site, the builder, its run-time folders; nothing private');
console.log('build-site ok');
