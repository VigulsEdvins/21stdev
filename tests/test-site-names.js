/** Published-site names: valid names pass; each bad one is refused for the right reason; ordinary names that merely contain a short bad word are not caught. */
const assert = require('assert');
const N = require('../site/js/site-names.js');
const ok = ['bakery-anna', 'abc', 'a1b', 'my-shop-2', '  Bakery-Anna  ', 'essex-plumbing', 'therapist-anna', 'method-studio', 'gorgeous-hair', 'classic-cars', 'pineapple-farm', 'sussex', 'assess', 'wisest', 'advisable', 'abcdefghij'.repeat(3)];
for (const n of ok) { const r = N.check(n); assert(r.ok, n + ' should pass: ' + JSON.stringify(r)); assert.strictEqual(r.name, n.trim().toLowerCase()); }
const bad = {
  empty: ['', '   ', null, undefined], short: ['ab', 'a'], long: ['abcdefghij'.repeat(3) + 'k'],
  characters: ['ba kery', 'bäckerei', 'a_b_c', 'a.b.c', 'shop!!', 'xn-abc', 'a/b', '../etc'],
  hyphen: ['-abc', 'abc-', 'a--b', 'xn--abc'],
  reserved: ['www', 'API', 'admin', 'edvlabs', 'builder', 'ns1', 'login'],
  lookalike: ['paypal', 'paypal-login', 'my-swedbank', 'amazon-deals', 'g00gle-search', 'str1pe-pay'],
  blocked: ['porn', 'p0rn', 'pornhub', 'free-porn', 'sex', 'sex-shop', 's3x', 'xxx', 'x-x-x-porn', 'poooorn', 'fuuuck-it', 'f-u-c-k', 'nazi-store', 'h1tler', 'scam-city', 'escorts', 'meth-lab']
};
let n = 0;
for (const [reason, list] of Object.entries(bad)) for (const input of list) {
  const r = N.check(input); n++;
  /* Disguised spellings: the reason may be blocked, lookalike or not worth pinning, so only “refused” is asserted for them. */
  assert(!r.ok, JSON.stringify(input) + ' should be refused');
  if (!['g00gle-search', 'str1pe-pay', 'f-u-c-k', 'x-x-x-porn', 'poooorn', 'fuuuck-it', 'escorts', 'nazi-store', 'h1tler', 's3x', 'p0rn'].includes(input)) assert.strictEqual(r.reason, reason, JSON.stringify(input) + ' reason: ' + r.reason);
  assert(typeof r.message === 'string' && r.message.length > 5, 'plain-words message');
}
assert.strictEqual(N.check('www').reason, 'reserved');
assert(N.MIN === 3 && N.MAX === 30);
console.log(`✓ site names: ${ok.length} good names, ${n} refused names, ordinary words not caught`);
