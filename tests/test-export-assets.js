const assert = require('assert');
const { findLocalAssetUrls, rewriteLocalAssetUrls } = require('../scripts/assembler.js');

console.log('Testing export local-asset detection & rewriting...');

const src = `
<img src="/site-b/assets/images/a b.jpg?x=1">
<div style="background:url('/site-a/pic.webp')"></div>
<script>const u = "/mom/public/images/p.png"; const cdn = "//cdn.example.com/x.png";</script>
<a href="/mom/work.html">page</a>
<img src="https://example.com/remote.png">
`;

const urls = findLocalAssetUrls(src).sort();
assert(urls.includes('/site-a/pic.webp'), 'css url() asset found');
assert(urls.includes('/mom/public/images/p.png'), 'js string asset found');
assert(!urls.some(u => u.includes('cdn.example.com')), 'protocol-relative URL ignored');
assert(!urls.some(u => u.endsWith('.html')), 'HTML pages are not assets');
assert(!urls.some(u => u.includes('remote.png')), 'absolute remote URL ignored');

const out = rewriteLocalAssetUrls(src, { '/site-a/pic.webp': 'assets/site-a/pic.webp', '/mom/public/images/p.png': 'data:image/png;base64,AA' });
assert(out.includes("url('assets/site-a/pic.webp')"));
assert(out.includes('"data:image/png;base64,AA"'));
assert(out.includes('//cdn.example.com/x.png'), 'untouched');
assert(out.includes('/mom/work.html'), 'untouched');

console.log('✅ Export asset helper tests passed!');

const { renderExternalHostsReport } = require('../scripts/builder/export-assets.js');
const none = renderExternalHostsReport({ 'index.html': '<html xmlns="http://www.w3.org/1999/xhtml"><a href="https://twitter.com/x">t</a><link href="style.css"></html>', 'style.css': '', 'script.js': '' });
assert(none.includes('loads nothing from other websites'), 'namespaces and anchors are not requests: ' + none);
const some = renderExternalHostsReport({ 'index.html': '<img src="https://images.unsplash.com/a.jpg"><script src="//cdn.example.com/x.js"></script>', 'style.css': "@import url('https://fonts.googleapis.com/css');", 'script.js': 'fetch("https://api.example.org/v1")' });
['images.unsplash.com', 'cdn.example.com', 'fonts.googleapis.com', 'api.example.org'].forEach(h => assert(some.includes('- ' + h), h));
console.log('✅ External host report tests passed!');
