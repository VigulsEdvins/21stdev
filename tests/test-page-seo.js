// Sharing and search tags written by renderPageHead.
const assert = require('assert');
const A = require('../scripts/assembler.js');
const { createStackManager } = require('../scripts/stack-manager.js');

const full = A.renderPageHead({ title: 'Zephyr Dental', description: 'Family dentistry.', shareImage: 'https://zephyr.example/share.jpg', canonical: 'https://zephyr.example/', robots: '' });
assert(full.headTags.includes('<meta property="og:title" content="Zephyr Dental">'));
assert(full.headTags.includes('<meta property="og:description" content="Family dentistry.">'));
assert(full.headTags.includes('<meta property="og:image" content="https://zephyr.example/share.jpg">'));
assert(full.headTags.includes('<meta name="twitter:card" content="summary_large_image">'));
assert(full.headTags.includes('<link rel="canonical" href="https://zephyr.example/">'));
assert(!full.headTags.includes('noindex'), 'indexing allowed by default');

const hidden = A.renderPageHead({ title: 'Draft', robots: 'noindex' });
assert(hidden.headTags.includes('<meta name="robots" content="noindex, nofollow">'));
assert(!hidden.headTags.includes('og:image') && !hidden.headTags.includes('canonical') && !hidden.headTags.includes('og:description'));

// relative or unsafe addresses are dropped; text is escaped
const unsafe = A.renderPageHead({ title: 'A "quoted" <b>', shareImage: '/share.jpg', canonical: 'javascript:alert(1)' });
assert(!unsafe.headTags.includes('og:image') && !unsafe.headTags.includes('canonical'));
assert(unsafe.headTags.includes('&quot;quoted&quot;') && !unsafe.headTags.includes('<b>'));

// the new fields are real page settings
const sm = createStackManager();
sm.setPage({ shareImage: 'https://x.example/a.png', canonical: 'https://x.example/', robots: 'noindex', bogus: 'no' });
const page = sm.getState().page;
assert.strictEqual(page.shareImage, 'https://x.example/a.png');
assert.strictEqual(page.robots, 'noindex');
assert.strictEqual(page.bogus, undefined);
console.log('✅ Page SEO tests passed!');

// JSON-LD, robots.txt and sitemap.xml
const ld = A.renderPageHead({ title: 'Zephyr', bizType: 'LocalBusiness', bizName: 'Zephyr </script> Dental', canonical: 'https://zephyr.example/', bizPhone: '+371 2000 0000' });
assert(ld.headTags.includes('<script type="application/ld+json">'), 'JSON-LD written');
const ldBody = ld.headTags.split('<script type="application/ld+json">')[1].split('</script>')[0];
const parsed = JSON.parse(ldBody);
assert.strictEqual(parsed['@type'], 'LocalBusiness');
assert.strictEqual(parsed.name, 'Zephyr </script> Dental', 'value is kept but cannot close the tag');
assert(!ldBody.includes('<'), 'no raw < inside JSON-LD');
assert(!A.renderPageHead({ title: 'x', bizType: 'LocalBusiness' }).headTags.includes('ld+json'), 'no name, no JSON-LD');
assert(!A.renderPageHead({ title: 'x', bizName: 'N' }).headTags.includes('ld+json'), 'no type, no JSON-LD');

assert.strictEqual(A.renderSiteFiles({ robots: 'noindex', canonical: 'https://a.example/' })['robots.txt'], 'User-agent: *\nDisallow: /\n');
assert.strictEqual(A.renderSiteFiles({ robots: 'noindex' })['sitemap.xml'], undefined);
const sf = A.renderSiteFiles({ canonical: 'https://a.example/home?x=1' });
assert(sf['robots.txt'].includes('Sitemap: https://a.example/sitemap.xml'));
assert(sf['sitemap.xml'].includes('<loc>https://a.example/home?x=1</loc>'));
assert.strictEqual(A.renderSiteFiles({})['sitemap.xml'], undefined, 'no address, no sitemap');
const bundle = A.generateExportBundle([], 'midnight-dark', {}, { page: { canonical: 'https://a.example/' } });
assert(bundle['robots.txt'] && bundle['sitemap.xml'], 'bundle carries the site files');
assert(!A.generateExportBundle([], 'midnight-dark', {}, { page: {} })['sitemap.xml']);
console.log('✅ JSON-LD and site files tests passed!');

const deploy = A.generateExportBundle([], 'midnight-dark', {}, { page: {} });
assert(deploy['_headers'].includes('Cache-Control') && deploy['DEPLOY.md'].includes('`_headers`'), 'deploy files in the bundle');
console.log('✅ Deploy files tests passed!');

// Content-Security-Policy option
const cspPlain = A.renderCsp('<html><body><section><button>Hi</button></section><script src="script.js"></script></body></html>', 'var a = 1;');
assert(cspPlain.strict && cspPlain.policy.includes("script-src 'self'") && !cspPlain.policy.includes('unsafe'.concat('-eval')), 'plain page gets a strict policy');
const cspCdn = A.renderCsp('<script src="https://cdn.jsdelivr.net/npm/x.js"></script>', 'import("https://esm.sh/three")');
assert(cspCdn.policy.includes('cdn.jsdelivr.net') && cspCdn.policy.includes('esm.sh'), 'CDNs the page uses are allowed');
const cspInline = A.renderCsp('<button onclick="go()">x</button>', '');
assert(!cspInline.strict && cspInline.policy.includes("'unsafe-inline'") && cspInline.reasons.length, 'inline handlers relax the policy and say why');
assert(A.renderCsp('<script type="application/ld+json">{"a":1}</script>', '').strict, 'JSON-LD is data, not a script');
assert(A.renderCsp('', 'eval("1")').policy.includes("'unsafe-eval'"));
const withCsp = A.generateExportBundle([], 'midnight-dark', {}, { page: {}, csp: true });
assert(withCsp['index.html'].includes('http-equiv="Content-Security-Policy"') && withCsp['README.md'].includes('Security policy'));
assert(!A.generateExportBundle([], 'midnight-dark', {}, { page: {} })['index.html'].includes('Content-Security-Policy'), 'off by default');
console.log('✅ CSP tests passed!');
