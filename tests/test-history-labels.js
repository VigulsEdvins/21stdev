// Plain-language history labels.
const assert = require('assert');
const { describeChange } = require('../scripts/builder/history-labels.js');

const sec = (id, extra = {}) => ({ id, slug: 'hero-' + id, sizing: { heightMode: 'auto' }, ...extra });
const snap = (stack, extra = {}) => ({ stack, theme: 'midnight-dark', customColors: {}, page: { title: 'T' }, viewport: 'desktop', ...extra });
const base = snap([sec('a'), sec('b')]);

assert.strictEqual(describeChange(null, base), 'Start');
assert.strictEqual(describeChange(base, snap([sec('a'), sec('b'), sec('c', { title: 'Pricing' })])), 'Added "Pricing"');
assert.strictEqual(describeChange(base, snap([sec('a')])), 'Removed "hero-b"');
assert.strictEqual(describeChange(base, snap([sec('b'), sec('a')])), 'Moved "hero-b"');
assert.strictEqual(describeChange(base, snap([sec('a', { locked: true }), sec('b')])), 'Locked "hero-a"');
assert.strictEqual(describeChange(snap([sec('a', { locked: true }), sec('b')]), base), 'Unlocked "hero-a"');
assert.strictEqual(describeChange(base, snap([sec('a'), sec('b', { hidden: true })])), 'Hid "hero-b"');
assert.strictEqual(describeChange(base, snap([sec('a', { sizing: { heightMode: 'screen' } }), sec('b')])), 'Resized "hero-a"');
assert.strictEqual(describeChange(base, snap([sec('a', { overrides: { h: { value: 'x' } } }), sec('b')])), 'Edited content in "hero-a"');
assert.strictEqual(describeChange(base, snap([sec('a'), sec('b', { elements: [{ id: 'e' }] })])), 'Edited widgets in "hero-b"');
assert.strictEqual(describeChange(base, { ...base, theme: 'light' }), 'Changed theme');
assert.strictEqual(describeChange(base, { ...base, page: { title: 'New' } }), 'Changed page settings');
assert.strictEqual(describeChange(base, { ...base, viewport: 'mobile' }), 'Switched to mobile view');
assert.strictEqual(describeChange(base, snap([{ ...sec('a'), slug: 'other' }, sec('b')])), 'Replaced "hero-a" with "other"');
console.log('✅ History label tests passed!');
