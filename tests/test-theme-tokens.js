// The theme's :root variables (scripts/assembler/theme-css.js): no name twice in a group, and a name that two groups
// both set must get the same value in every theme, so which line wins cannot change the look.
const assert = require('assert');
const { THEME_PRESETS, generateUniversalThemeStyles } = require('../scripts/assembler.js');

for (const [id, theme] of Object.entries(THEME_PRESETS)) {
  const css = generateUniversalThemeStyles(theme);
  const root = css.split('\n    }\n')[0];
  const groups = root.split(/\n\n/);
  groups.forEach((g) => {
    const names = [...g.matchAll(/^\s+(--[\w-]+):/gm)].map(m => m[1]);
    assert.strictEqual(new Set(names).size, names.length, id + ': a variable is set twice inside one group');
  });
  const values = {};
  for (const m of root.matchAll(/^\s+(--[\w-]+): (.*);$/gm)) {
    if (values[m[1]] !== undefined) assert.strictEqual(values[m[1]], m[2], id + ': ' + m[1] + ' is set twice with different values');
    values[m[1]] = m[2];
  }
  assert(Object.keys(values).length > 80, id + ': the variable list is far shorter than expected');
}
console.log('✅ Theme tokens passed');
