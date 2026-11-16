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
for (const p of ['index.html', 'account/index.html', '_headers', '404.html', 'builder/index.html', 'builder/preview-frame/index.html', 'builder/scripts/builder/frame-doc.js', 'builder/builder.js', 'builder/registry.js', 'builder/site/js/prices.js', 'builder/export-assets.json', 'builder/script-parts.json', 'builder/site/styles/tokens.css', 'builder/site/fonts', 'builder/features', 'builder/thumbs', 'assets/library'])
  assert(has(p), p + ' is staged');
for (const p of ['builder.html', 'node_modules', '.dev.vars', 'package.json', 'features', 'builder/package.json', 'builder/scripts/check-headers.js', 'builder/tests'])
  assert(!has(p), p + ' is not staged');
const walkAll = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkAll(path.join(d, e.name)) : [path.join(d, e.name)]));
const all = walkAll(out);
assert.strictEqual(all.length, files, 'the count matches');
assert(!all.some((f) => /\.(tsx|swp)$|\.dev\.vars|\.env/.test(f)), 'no sources or private files');
// templates kept only for client previews (meta.json "previewOnly") are nowhere on the site: no files, no thumbs, no registry line
const previewOnly = fs.readdirSync(path.join(__dirname, '..', 'features')).filter((s) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'features', s, 'meta.json'), 'utf8')).previewOnly === true; } catch (_) { return false; } });
assert(previewOnly.length >= 40, 'preview-only templates found: ' + previewOnly.length);
const staged = new Function('window', fs.readFileSync(path.join(out, 'builder', 'registry.js'), 'utf8') + ';return window.FEATURE_REGISTRY;')({});
for (const s of previewOnly) {
  assert(!has('builder/features/' + s) && !has('builder/thumbs/' + s + '.webp'), s + ': not staged');
  assert(!staged.some((i) => i.slug === s), s + ': not in the staged registry');
}
assert(staged.some((i) => i.slug === 'mega-menu-header') && staged.length > 200, 'other blocks, drafts included, are still there');
assert(fs.readFileSync(path.join(__dirname, '..', 'registry.js'), 'utf8').includes('"slug":"dental-mintline"'), 'the repository registry is untouched');
fs.rmSync(out, { recursive: true, force: true });
console.log('  ✓ dist has the site, the builder, its run-time folders; nothing private');
console.log('build-site ok');
