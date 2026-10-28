/* site/_headers: every path gets exactly one Cache-Control and one Content-Security-Policy (Cloudflare adds rules together, so a rule that sets
   its own must first remove the general one with "! Name"), and wrangler.jsonc keeps dashboard variables across deploys. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const H = require('../scripts/check-headers.js');
const rules = H.parseHeaders(fs.readFileSync(path.join(__dirname, '..', 'site', '_headers'), 'utf8'));

for (const [rule, h] of Object.entries(rules)) {
  if (rule === '/*') continue;
  const gone = h['!detach'] || [];
  for (const name of ['cache-control', 'content-security-policy']) if (h[name]) assert(gone.includes(name), `${rule} sets ${name} without removing the general one first`);
}
assert.strictEqual(H.effective(rules, '/js/*')['cache-control'], 'public, max-age=0, must-revalidate', 'scripts are revalidated on every load');
assert.strictEqual(H.effective(rules, '/*.css')['cache-control'], 'public, max-age=0, must-revalidate', 'styles are revalidated on every load');
assert(/immutable/.test(H.effective(rules, '/fonts/*')['cache-control']) && !/max-age=300/.test(H.effective(rules, '/fonts/*')['cache-control']), 'fonts are cached for a year, not also for five minutes');
assert(/max-age=300/.test(rules['/*']['cache-control']), 'pages are cached for five minutes');

const wrangler = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
assert.strictEqual(wrangler.keep_vars, true, 'plain variables set in the dashboard must survive a deploy');
assert.strictEqual(wrangler.assets.directory, './dist', 'only the staged folder (site/ plus the builder, scripts/build-site.js) is published, never the repository root');
assert.deepStrictEqual(wrangler.assets.run_worker_first, ['/api/*']);
console.log('✅ Headers file and wrangler.jsonc tests passed!');
