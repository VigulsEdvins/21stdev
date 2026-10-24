const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const A = require('../scripts/assembler.js');
const { analyse } = require('../scripts/lint-tokens.js');
const { scaffold } = require('../scripts/new-feature.js');

console.log('Testing standard design tokens...');

const css = A.generateUniversalThemeStyles(A.resolveTheme('midnight-dark'));
for (const t of ['--bg:', '--text:', '--accent:', '--radius:', '--font-display:', '--font-body:']) {
  assert(css.includes(t), `universal theme must define ${t}`);
}

// Page fonts override the defaults, in the same cascade order the preview and export use
const head = A.renderPageHead({ fontDisplay: 'Playfair Display', fontBody: 'Inter' });
assert(head.css.includes("--font-display: 'Playfair Display'"));
assert(head.css.includes("--font-body: 'Inter'"));
assert(!/Playfair[^']*['"<>;{}]/.test(A.renderPageHead({ fontDisplay: "Evil'; } body { x" }).css.replace("'Evil", '')), 'font names are sanitised');

// The lint knows tokenised from hard-coded CSS
assert.strictEqual(analyse('a { color: var(--text); background: var(--bg); }').tokenised, true);
assert.strictEqual(analyse('a { color: #fff; background: #000; border: 1px solid rgba(0,0,0,.1) }').tokenised, false);

// New features start tokenised
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tok-'));
const { dir } = scaffold({ _: ['token-demo'] }, tmp);
assert(analyse(fs.readFileSync(path.join(dir, 'style.css'), 'utf8')).tokenised, 'scaffolded CSS uses tokens');
fs.rmSync(tmp, { recursive: true, force: true });

console.log('✅ Design token tests passed!');
