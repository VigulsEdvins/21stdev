// Starter pages by industry (scripts/builder/starters.js).
const assert = require('assert');
const { buildStarter, listStarters, MIN_OWN } = require('../scripts/builder/starters.js');
const registry = require('../registry.json').items;

const mk = (slug, category, industry, extra = {}) => ({ slug, title: slug, category, industry, weight: 'light', status: 'stable', type: 'component', ...extra });
const fake = [
  mk('nav-a', 'Headers & Nav', ['saas']), mk('nav-b', 'Headers & Nav', ['general']),
  mk('hero-a', 'Heroes', ['general']), mk('hero-s', 'Heroes', ['saas']), mk('hero-heavy', 'Heroes', ['saas'], { weight: 'heavy' }), mk('hero-draft', 'Heroes', ['saas'], { status: 'draft' }),
  mk('card-s', 'Cards & Tiles', ['saas']), mk('gal-s', 'Galleries & Bento', ['saas']), mk('scroll-g', 'Scroll & Parallax', ['general']), mk('card-g', 'Cards & Tiles', ['general']),
  mk('cta-g', 'Buttons & UI', ['general']), mk('foot-s', 'Footers & Endings', ['saas']),
  mk('tpl', 'Full Templates', ['saas'], { type: 'template' })
];
const s = buildStarter(fake, 'saas');
assert.deepStrictEqual(s.map(x => x.slug), ['nav-a', 'hero-s', 'card-s', 'gal-s', 'scroll-g', 'cta-g', 'foot-s'], 'page order, own components first, general fills gaps');
assert(!s.some(x => ['hero-heavy', 'hero-draft', 'tpl'].includes(x.slug)), 'heavy, draft and template items are left out');
assert.strictEqual(new Set(s.map(x => x.slug)).size, s.length, 'no component twice');
assert.deepStrictEqual(buildStarter(fake, 'saas'), s, 'deterministic');

// against the real registry
const starters = listStarters(registry);
assert(starters.length >= 4, 'several industries get a starter');
for (const st of starters) {
  assert(st.sections.length >= 4 && st.sections.length <= 7, `${st.industry} has a sensible size`);
  assert(st.sections[0].category === 'Headers & Nav' && st.sections[st.sections.length - 1].category === 'Footers & Endings', `${st.industry}: starts with a nav and ends with a footer`);
  assert(st.sections.every(x => registry.find(r => r.slug === x.slug)), 'every section exists');
  assert(registry.filter(r => (r.industry || []).includes(st.industry)).length >= MIN_OWN);
}
assert(!starters.some(x => x.industry === 'general'), 'general is not an industry starter');
console.log('✅ Starter tests passed!');
