const assert = require('assert');
const { createStackManager } = require('../scripts/stack-manager.js');
const { assemblePreviewDocument, THEME_PRESETS } = require('../scripts/assembler.js');
const { sanitizeState } = require('../scripts/project-sanitize.js');

console.log('Testing per-section theme mode (Default / Match page / Keep original)...');
const light = THEME_PRESETS['clean-minimal'];
const sm = createStackManager();
const sec = sm.addSection('beam-wordmark-footer');
const attrs = (stack, nativeMap) => {
  const html = assemblePreviewDocument(stack, light, {}, { nativeMap });
  const m = html.match(/<section class="page-section[^"]*"[^>]*>/);
  return m ? m[0] : '';
};

// default: no lock -> follows the (light) page
let tag = attrs(sm.getStack(), {});
assert(!/data-native-for/.test(tag), 'default follows the page');
assert(/data-theme="light"/.test(tag));

// keep original: a dark-designed section keeps its dark look on a light page
sm.setSectionThemeMode(sec.id, 'keep', 'dark');
tag = attrs(sm.getStack(), {});
assert(/data-native-for="light"/.test(tag), 'keep marks the section native under the light page: ' + tag);
assert(/data-theme="dark"/.test(tag), 'keep renders it with the dark palette');

// match page: overrides a component that is locked by default
sm.setSectionThemeMode(sec.id, 'match');
tag = attrs(sm.getStack(), { 'beam-wordmark-footer': ['light'] });
assert(!/data-native-for/.test(tag), 'match ignores the component lock');
assert(/data-theme="light"/.test(tag));

// back to the component's default
sm.setSectionThemeMode(sec.id, '');
assert.strictEqual(sm.getStack()[0].themeMode, undefined);
tag = attrs(sm.getStack(), { 'beam-wordmark-footer': ['light'] });
assert(/data-native-for="light"/.test(tag), 'default again uses the component lock');

// the mode survives a project save and load, and junk is dropped
sm.setSectionThemeMode(sec.id, 'keep', 'light');
const saved = JSON.stringify(sanitizeState({ stack: sm.getStack() }).state);
assert(/"themeMode":"keep"/.test(saved) && /"designPolarity":"light"/.test(saved), 'sanitize keeps the mode');
const junk = sanitizeState({ stack: [{ id: 'sec-1', slug: 'beam-wordmark-footer', themeMode: '<script>', designPolarity: 'x' }] }).state;
assert(!/themeMode/.test(JSON.stringify(junk)), 'unknown modes are dropped');
console.log('✅ Section theme mode tests passed!');
