const assert = require('assert');
const { findLocalAssetUrls, rewriteLocalAssetUrls } = require('../scripts/assembler.js');

console.log('Testing export local-asset detection & rewriting...');

const src = `
<img src="/vivmgmt/assets/images/a b.jpg?x=1">
<div style="background:url('/betteroff/pic.webp')"></div>
<script>const u = "/mom/public/images/p.png"; const cdn = "//cdn.example.com/x.png";</script>
<a href="/mom/work.html">page</a>
<img src="https://example.com/remote.png">
`;

const urls = findLocalAssetUrls(src).sort();
assert(urls.includes('/betteroff/pic.webp'), 'css url() asset found');
assert(urls.includes('/mom/public/images/p.png'), 'js string asset found');
assert(!urls.some(u => u.includes('cdn.example.com')), 'protocol-relative URL ignored');
assert(!urls.some(u => u.endsWith('.html')), 'HTML pages are not assets');
assert(!urls.some(u => u.includes('remote.png')), 'absolute remote URL ignored');

const out = rewriteLocalAssetUrls(src, { '/betteroff/pic.webp': 'assets/betteroff/pic.webp', '/mom/public/images/p.png': 'data:image/png;base64,AA' });
assert(out.includes("url('assets/betteroff/pic.webp')"));
assert(out.includes('"data:image/png;base64,AA"'));
assert(out.includes('//cdn.example.com/x.png'), 'untouched');
assert(out.includes('/mom/work.html'), 'untouched');

console.log('✅ Export asset helper tests passed!');
