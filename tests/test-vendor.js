// Third-party files in scripts/vendor/ stay exactly as published: they are skipped by the own-code scan, so this pins them to the npm package.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const vendor = path.join(__dirname, '..', 'scripts', 'vendor');
const SOURCES = { 'jszip.min.js': path.join(__dirname, '..', 'node_modules', 'jszip', 'dist', 'jszip.min.js') };
for (const f of fs.readdirSync(vendor)) {
  assert(SOURCES[f], 'scripts/vendor/' + f + ' needs an entry in tests/test-vendor.js saying which package it is copied from');
  if (fs.existsSync(SOURCES[f])) assert.strictEqual(sha(path.join(vendor, f)), sha(SOURCES[f]), f + ' differs from the npm package: copy it again, do not edit it');
}
// the builder page loads nothing from a CDN for JSZip any more
assert(!/cdnjs\.cloudflare\.com\/ajax\/libs\/jszip/.test(fs.readFileSync(path.join(__dirname, '..', 'builder.html'), 'utf8')));
console.log('✅ Vendor files match their packages');
