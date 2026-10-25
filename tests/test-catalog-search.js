const assert = require('assert');
const S = require('../scripts/catalog-search.js');

console.log('Testing catalog search, filters and library store...');

const items = [
  { slug: 'glass-folder-cards', title: 'Glass Folder Cards', category: 'Cards & Tiles', tags: ['glass', 'folder', 'cards'], mood: ['futuristic'], industry: ['saas'], weight: 'light', status: 'stable', description: 'Frosted glass folders.' },
  { slug: 'disc-cascade-carousel', title: 'Disc Cascade Carousel', category: '3D & Carousels', tags: ['carousel', 'disc', '3d'], mood: ['dark', 'editorial'], industry: ['media'], weight: 'medium', status: 'stable', description: 'Film catalogue told in discs.' },
  { slug: 'tilt-cascade-carousel', title: 'Tilt Cascade Carousel', category: '3D & Carousels', tags: ['carousel', 'tilt', '3d'], mood: ['dark'], industry: ['media'], weight: 'medium', status: 'draft', description: 'Tilted cascade.' },
  { slug: 'neon-hero', title: 'Neon Hero', category: 'Heroes', tags: ['hero', 'neon', 'glow'], mood: ['dark', 'futuristic'], industry: ['saas'], weight: 'heavy', status: 'stable', description: 'WebGL neon hero.' },
  { isWidget: true, slug: 'btn-neon', title: 'Neon Glow Button', category: 'Buttons & UI', tags: ['button', 'neon'] }
];

// search
assert.strictEqual(S.searchItems(items, 'carousel')[0].slug.includes('carousel'), true);
assert.strictEqual(S.searchItems(items, 'carosel').length, 2, 'one-letter typo still finds carousels');
assert.strictEqual(S.searchItems(items, 'crousel disc').map(i => i.slug).join(), 'disc-cascade-carousel', 'all tokens must match');
assert.strictEqual(S.searchItems(items, 'neon')[0].slug, 'neon-hero', 'title+tag match ranks first');
assert.strictEqual(S.searchItems(items, 'zzzzqq').length, 0);
assert.strictEqual(S.searchItems(items, '').length, items.length);
assert.strictEqual(S.searchItems(items, 'editorial').map(i => i.slug).join(), 'disc-cascade-carousel', 'matches mood attributes');
assert.strictEqual(S.editDistance('abcd', 'abdc', 1), 1, 'transposition costs 1');

// similar
const sim = S.similarItems(items, items[1]);
assert.strictEqual(sim[0].slug, 'tilt-cascade-carousel');
assert(!sim.some(i => i.slug === 'disc-cascade-carousel' || i.isWidget));

// filters
assert.strictEqual(items.filter(i => S.matchesFilters(i, {})).length, 4, 'drafts hidden by default, widgets pass');
assert.strictEqual(items.filter(i => S.matchesFilters(i, { showDrafts: true })).length, 5);
assert.deepStrictEqual(items.filter(i => S.matchesFilters(i, { mood: 'dark' })).map(i => i.slug), ['disc-cascade-carousel', 'neon-hero']);
assert.deepStrictEqual(items.filter(i => S.matchesFilters(i, { weight: 'heavy' })).map(i => i.slug), ['neon-hero']);
assert.deepStrictEqual(items.filter(i => S.matchesFilters(i, { onlySlugs: ['neon-hero', 'btn-neon'], showDrafts: true })).map(i => i.slug), ['neon-hero', 'btn-neon']);

// library store
const mem = {}; const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
const lib = S.createLibraryStore(storage);
assert.strictEqual(lib.toggleFavourite('a'), true);
assert.strictEqual(lib.toggleFavourite('b'), true);
assert.deepStrictEqual(lib.favourites(), ['b', 'a']);
assert.strictEqual(lib.toggleFavourite('a'), false);
lib.toggleFavourite('c');
assert.strictEqual(lib.mergeFavourites(['c', 'd', 'e', 5, '']), 2, 'only new string slugs are merged');
assert.deepStrictEqual(lib.favourites().slice(0, 1), ['c'], 'existing order is kept');
for (let i = 0; i < 14; i++) lib.addRecent('s' + i);
lib.addRecent('s5');
assert.strictEqual(lib.recents().length, 10);
assert.strictEqual(lib.recents()[0], 's5');
mem['web_builder_favourites_v1'] = '{bad json';
assert.deepStrictEqual(lib.favourites(), [], 'corrupted storage is tolerated');

console.log('✅ Catalog search tests passed!');

// synonyms: people search with other words than the component's own
{
  const { searchItems } = require('../scripts/catalog-search.js');
  const items = [
    { slug: 'pricing-table-switch', title: 'Pricing Table', tags: ['pricing'], category: 'Cards & Tiles' },
    { slug: 'sticky-shrink-header', title: 'Sticky Header', tags: ['header'], category: 'Headers & Nav' },
    { slug: 'cookie-notice-bar', title: 'Cookie Notice Bar', tags: ['cookies'], category: 'Buttons & UI' },
    { slug: 'other', title: 'Something else', tags: ['x'], category: 'Heroes' }
  ];
  assert.strictEqual(searchItems(items, 'plans')[0].slug, 'pricing-table-switch', 'plans finds pricing');
  assert.strictEqual(searchItems(items, 'navbar')[0].slug, 'sticky-shrink-header', 'navbar finds header');
  assert.strictEqual(searchItems(items, 'gdpr')[0].slug, 'cookie-notice-bar', 'gdpr finds the cookie bar');
  assert.strictEqual(searchItems(items, 'nonsense').length, 0, 'unrelated words still find nothing');
  assert.strictEqual(searchItems(items, 'pricing')[0].slug, 'pricing-table-switch');
  console.log('✅ Synonym search tests passed!');
}
