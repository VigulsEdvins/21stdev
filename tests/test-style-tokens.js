// Style system: components only use tokens that exist, and stray hard-coded colours are limited to a short, named list.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const S = path.join(__dirname, '..', 'site');
const read = (f) => fs.readFileSync(path.join(S, f), 'utf8');
const tokens = read('styles/tokens.css');
const defined = new Set((tokens.match(/--[\w-]+(?=\s*:)/g) || []));

['styles/components.css', 'style/style-page.css', 'style/index.html'].forEach(f => {
  const used = new Set((read(f).match(/var\((--[\w-]+)/g) || []).map(x => x.slice(4)));
  const local = new Set((read(f).match(/--[\w-]+(?=\s*:)/g) || []));
  used.forEach(u => assert(defined.has(u) || local.has(u), `${f} uses ${u}, which tokens.css does not define`));
});

// colours written out in the component CSS that are not tokens: only these (disabled greys, sample-text tint, footer rule)
const ALLOWED = new Set(['#fff', '#ffffff', '#d9cfb8', '#e9e2cd', '#fbe9b4', '#425059', '#c9c4b3', '#b9b19c', '#6b6458', '#5b564b', '#000', '#a3261b']);
const stray = (read('styles/components.css').match(/#[0-9a-fA-F]{3,6}\b/g) || []).map(s => s.toLowerCase()).filter(c => !ALLOWED.has(c));
assert.deepStrictEqual([...new Set(stray)], [], 'colours in components.css must be tokens or on the allowed list: ' + stray.join(', '));

// the style page lists every pair the contrast check measures
const { PAIRS } = require('../scripts/check-brand-contrast.js');
const page = read('style/index.html');
PAIRS.forEach(([fg, bg]) => assert(page.includes(`"${fg}"`) && page.includes(`"${bg}"`), `style page lacks the pair ${fg} on ${bg}`));
// every state the plan asks for is shown
['is-hover', 'is-focus', 'is-active', 'disabled', 'has-error', 'is-ok', 'is-checked', 'is-done', 'is-now'].forEach(s => assert(page.includes(s), 'style page shows the ' + s + ' state'));
console.log('✅ Style token tests passed!');
