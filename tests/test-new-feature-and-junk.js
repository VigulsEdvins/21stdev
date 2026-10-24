const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scaffold } = require('../scripts/new-feature.js');
const { validateMeta } = require('../scripts/schema.js');
const { cleanHtml } = require('../scripts/clean-features.js');

console.log('Testing new-feature scaffold, schema and junk cleaning...');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
const { dir } = scaffold({ _: ['my-test-hero'], category: 'Heroes', title: 'My Test Hero' }, tmp);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
assert.deepStrictEqual(validateMeta(meta), [], 'scaffolded meta must satisfy the schema');
assert.strictEqual(meta.status, 'draft');
for (const f of ['index.html', 'style.css', 'script.js']) assert(fs.existsSync(path.join(dir, f)), `${f} scaffolded`);
assert.throws(() => scaffold({ _: ['my-test-hero'] }, tmp), /already exists/);
assert.throws(() => scaffold({ _: ['Bad Slug'] }, tmp), /Usage/);
assert.throws(() => scaffold({ _: ['ok-slug'], category: 'Nope' }, tmp), /Unknown category/);
fs.rmSync(tmp, { recursive: true, force: true });

assert(validateMeta({ slug: 'x' }).length > 3, 'incomplete meta is rejected');

const dirty = '<head><link rel="icon" href="/vite.svg" /></head><body><script type="module" src="https://static.cloudflareinsights.com/beacon.min.js/abc" data-cf-beacon=\'{}\'></script></body>';
const clean = cleanHtml(dirty);
assert(!/vite\.svg|cloudflareinsights/.test(clean), 'junk removed');

// No feature may ship third-party analytics beacons or the missing Vite favicon
const featuresDir = path.join(__dirname, '..', 'features');
for (const slug of fs.readdirSync(featuresDir)) {
  const f = path.join(featuresDir, slug, 'index.html');
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  assert(!/cloudflareinsights/.test(html), `${slug}: analytics beacon present`);
  assert(!/href=["']\/vite\.svg/.test(html), `${slug}: dead /vite.svg favicon link`);
}

console.log('✅ New feature scaffold & junk-cleaning tests passed!');
