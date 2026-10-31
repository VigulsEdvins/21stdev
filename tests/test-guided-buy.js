/** The buying overlay's pure parts: which options a destination has, and that the order sent to the server holds choices only (never a price). */
const assert = require('assert');
const G = require('../scripts/builder/guided-buy.js');

assert.deepStrictEqual(G.optionsFor('edvlabs'), { name: true, hosting: true, deployHelp: false });
assert.deepStrictEqual(G.optionsFor('domain'), { name: false, hosting: true, deployHelp: true });
assert.deepStrictEqual(G.optionsFor('download'), { name: false, hosting: false, deployHelp: true });
assert.deepStrictEqual(G.optionsFor('moon'), { name: false, hosting: false, deployHelp: false });

const s = { projectId: 'pid', destination: 'download', editor: 1, hosting: 'yearly', deployHelp: true, siteName: 'left-over-name', price: 1, payToday: 1 };
assert.deepStrictEqual(G.orderFrom(s), { projectId: 'pid', destination: 'download', editor: true, hosting: null, deployHelp: true }, 'a download carries no hosting and no name');
assert.deepStrictEqual(G.orderFrom({ ...s, destination: 'edvlabs' }), { projectId: 'pid', destination: 'edvlabs', editor: true, hosting: 'yearly', deployHelp: false, siteName: 'left-over-name' }, 'deploy help is dropped on an edvlabs address');
assert.strictEqual(G.orderFrom({ ...s, destination: 'edvlabs', hosting: 'none' }).hosting, null, '"No change" sends no hosting');
for (const o of [G.orderFrom(s), G.orderFrom({ ...s, destination: 'domain' })]) assert(!('price' in o) && !('payToday' in o), 'no price in an order');
// the domain a client types: the same shape the server accepts, in plain words
const ok = (v) => G.checkDomain(v);
assert.deepStrictEqual(ok(' WWW.Bakery-Anna.com '), { ok: true, host: 'www.bakery-anna.com', message: '' });
assert.deepStrictEqual(ok('shop.example.co.uk').host, 'shop.example.co.uk');
for (const bad of ['', 'bakery.com', 'bakery', 'https://www.bakery.com', 'www.bakery.com/x', 'www.bakery.com:8080', 'a b.bakery.com', 'www.edvlabs.com', 'x.edvlabs.com', 'www.bakery', 'www..bakery.com', 'www.-bakery.com', 5, null, undefined]) assert.strictEqual(ok(bad).ok, false, String(bad));
assert(/www\.yourdomain\.com|in front/i.test(ok('bakery.com').message), 'a bare domain is explained: put something in front, like www');
// the edvlabs name that is made from a domain (the site is first put online there)
assert.strictEqual(G.siteNameFor('www.bakery-anna.com'), 'bakery-anna'); assert.strictEqual(G.siteNameFor('shop.example.co.uk'), 'shop-example'); assert.strictEqual(G.siteNameFor('www.ab.com'), 'ab-site');
assert.strictEqual(G.siteNameFor('www.' + 'x'.repeat(50) + '.com').length <= 30, true);
for (const h of ['www.xn--bcher-kva.de', 'a.b-c.d-e.com', 'www.' + 'x'.repeat(50) + '.com']) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(G.siteNameFor(h)) && G.siteNameFor(h).length >= 3 && G.siteNameFor(h).length <= 30, h + ' makes a valid edvlabs name: ' + G.siteNameFor(h));
assert.strictEqual(G.orderFrom({ projectId: 'p', destination: 'domain', editor: false, hosting: 'monthly', deployHelp: false, siteName: 'bakery-anna' }).siteName, 'bakery-anna', 'the generated name travels with the order');
console.log('✓ guided buy: options and order');
