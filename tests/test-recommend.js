/** Recommendation rules: ten different briefs each give a sensible page of 5 to 9 blocks, with a reason for each. */
const assert = require('assert');
const R = require('../site/js/recommend.js');
const B = require('../site/js/brief.js');
const Q = require('../site/js/questions.js');

const brief = (a) => ({ v: 1, path: 'done', answers: Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v === '?' ? { value: null, unknown: true } : { value: v, unknown: false }])) });
const ids = (b) => R.recommend(b).blocks.map((x) => x.id);
const known = Q.BLOCKS.map((b) => b[0]);

const cases = {
  'everything unknown': brief({ purpose: '?', action: '?', content: '?' }),
  'empty brief': brief({}),
  'hair salon that takes bookings': brief({ purpose: 'business', action: ['book', 'call'], content: 'some' }),
  'shop selling things': brief({ purpose: 'business', action: ['buy'], content: 'all' }),
  'portfolio of a photographer': brief({ purpose: 'self', action: ['see', 'call'], content: 'all' }),
  'a CV page': brief({ purpose: 'self', action: ['read'], content: 'none' }),
  'a wedding': brief({ purpose: 'event', action: ['signup'], content: 'some' }),
  'one product launch': brief({ purpose: 'product', action: ['buy', 'signup'], content: 'all' }),
  'something else, no photos': brief({ purpose: 'other', action: ['call'], content: 'none' }),
  'two languages restaurant': brief({ purpose: 'business', action: ['book'], languages: '2', content: 'some' })
};
for (const [name, b] of Object.entries(cases)) {
  assert.deepStrictEqual(B.check(b), [], name + ' is a valid brief');
  const r = R.recommend(b);
  assert(r.blocks.length >= 5 && r.blocks.length <= 9, `${name}: ${r.blocks.length} blocks`);
  assert(r.blocks.every((x) => known.includes(x.id) && x.because && x.label), name + ': known ids with a reason');
  assert.strictEqual(new Set(r.blocks.map((x) => x.id)).size, r.blocks.length, name + ': no repeats');
  const order = r.blocks.map((x) => R.ORDER.indexOf(x.id)); assert.deepStrictEqual(order, [...order].sort((a, b) => a - b), name + ': in page order');
  assert.deepStrictEqual(ids(b), ids(JSON.parse(JSON.stringify(b))), name + ': same input, same answer');
}
const safe = ['banner', 'about', 'services', 'reviews', 'contact'];
assert.deepStrictEqual(ids(cases['everything unknown']), safe, 'unknown gives the safe set');
assert.deepStrictEqual(ids(cases['empty brief']), safe);
assert(ids(cases['hair salon that takes bookings']).includes('contact') && ids(cases['hair salon that takes bookings']).includes('prices'), 'booking adds contact and prices');
assert(ids(cases['shop selling things']).includes('prices'), 'a shop shows prices');
assert(ids(cases['portfolio of a photographer']).includes('gallery'), 'a portfolio has a gallery');
assert(!ids(cases['a CV page']).includes('team') && !ids(cases['a CV page']).includes('gallery'), 'no photos means no gallery or team');
assert(ids(cases['a wedding']).includes('map') && !ids(cases['a wedding']).includes('reviews'), 'an event has a map and no reviews');
assert(ids(cases['a wedding']).includes('newsletter'), 'a sign-up goal adds the sign-up block');
// the visitor's own choice wins
const own = brief({ purpose: 'business', blocks: ['contact', 'banner', 'faq'] });
assert.deepStrictEqual(ids(own), ['banner', 'faq', 'contact']); assert.strictEqual(R.recommend(own).chosen, true);
// the rule table is plain data, and each rule names real blocks and questions
for (const rule of R.RULES) { for (const q of Object.keys(rule.when)) assert(Q.QUESTIONS.some((x) => x.id === q), 'rule asks a real question: ' + q); for (const [b, w, why] of rule.add) assert(known.includes(b) && typeof w === 'number' && why.length > 10, 'rule is well formed: ' + b); }
console.log(`✓ recommendations: ${Object.keys(cases).length} sample briefs give 5 to 9 blocks each, with reasons; unknown gives the safe set; the visitor's own choice wins`);
