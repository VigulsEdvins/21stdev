// syncRegistry on a throwaway vault: index files, slim registry.js, full registry.json, thumbnail pickup.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { syncRegistry } = require('../scripts/sync-registry.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'));
const mk = (slug, meta, extra = {}) => {
  const dir = path.join(root, 'features', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta));
  fs.writeFileSync(path.join(dir, 'index.html'), extra.html || '<h1>Hi</h1>');
  fs.writeFileSync(path.join(dir, 'style.css'), 'h1{color:red}');
  fs.writeFileSync(path.join(dir, 'script.js'), '// js');
};
mk('b-feature', { slug: 'b-feature', title: 'B', category: 'Heroes', description: 'x'.repeat(30), tags: ['a', 'b', 'c'], origin: { source: 'custom', license: 'own', termsNote: 'long '.repeat(50) }, customizable: [{ id: 'h', label: 'H', type: 'text', selector: ':scope h1' }], order: 2 });
mk('a-feature', { slug: 'a-feature', title: 'A', category: 'Footers & Endings', description: 'y'.repeat(30), tags: ['a', 'b', 'c'], order: 1 });
fs.mkdirSync(path.join(root, 'features', 'no-meta'), { recursive: true });
fs.mkdirSync(path.join(root, 'thumbs'));
fs.writeFileSync(path.join(root, 'thumbs', 'a-feature.jpg'), 'x');

const res = syncRegistry(root);
assert.strictEqual(res.count, 2, 'folders without meta.json are ignored');
const json = JSON.parse(fs.readFileSync(path.join(root, 'registry.json'), 'utf8'));
assert.deepStrictEqual(json.items.map(i => i.slug), ['a-feature', 'b-feature'], 'sorted by order');
assert.strictEqual(json.totalFeatures, 2);
const full = json.items.find(i => i.slug === 'b-feature');
assert(full.customizable.length === 1 && full.origin.termsNote, 'registry.json keeps field lists and notes');
assert.strictEqual(json.items.find(i => i.slug === 'a-feature').thumb, 'thumbs/a-feature.jpg', 'thumbnail picked up');
assert.strictEqual(json.items.find(i => i.slug === 'b-feature').thumb, null);

const window = {};
new Function('window', fs.readFileSync(path.join(root, 'registry.js'), 'utf8'))(window);
const slim = window.FEATURE_REGISTRY.find(i => i.slug === 'b-feature');
assert.strictEqual(slim.customizable, undefined, 'registry.js leaves out the field list');
assert.strictEqual(slim.customizableCount, 1);
assert.deepStrictEqual(slim.origin, { source: 'custom', license: 'own' }, 'registry.js keeps only source and licence');
assert(!slim.files, 'registry.js has no source files');
fs.rmSync(root, { recursive: true, force: true });
console.log('✅ Sync registry tests passed!');
