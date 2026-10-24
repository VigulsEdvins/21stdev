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
