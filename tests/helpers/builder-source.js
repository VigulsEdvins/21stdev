/**
 * Source-text helper for tests that assert on how the builder is wired.
 * The builder is split across builder.js and scripts/builder/*.js; this returns them as one string.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function readBuilderSource() {
  const parts = [fs.readFileSync(path.join(ROOT, 'builder.js'), 'utf8')];
  const dir = path.join(ROOT, 'scripts', 'builder');
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().forEach(f => parts.push(fs.readFileSync(path.join(dir, f), 'utf8')));
  }
  return parts.join('\n');
}

module.exports = { readBuilderSource };
