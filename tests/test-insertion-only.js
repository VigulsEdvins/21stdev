const assert = require('assert');
const { isInsertionOnly } = require('../scripts/builder/preview-patch.js');

const s = (id, extra = {}) => ({ id, slug: 'x-' + id, category: 'Heroes', ...extra });
console.log('Testing in-place section insertion rules...');
assert(isInsertionOnly([s('a')], [s('a'), s('b')]), 'append');
assert(isInsertionOnly([s('a'), s('c')], [s('a'), s('b'), s('c')]), 'insert in the middle');
assert(isInsertionOnly([s('a')], [s('a', { sizing: { paddingY: 'large' } }), s('b')]), 'sizing is patched separately');
assert(!isInsertionOnly([], [s('a')]), 'the first section needs a full load');
assert(!isInsertionOnly([s('a'), s('b')], [s('a')]), 'removal');
assert(!isInsertionOnly([s('a'), s('b')], [s('b'), s('a'), s('c')]), 'reorder');
assert(!isInsertionOnly([s('a')], [s('a', { title: 'changed' }), s('b')]), 'a changed section');
assert(!isInsertionOnly([s('a')], [s('a')]), 'nothing added');
console.log('✅ In-place insertion rules passed!');
