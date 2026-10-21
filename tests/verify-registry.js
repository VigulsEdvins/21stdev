const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { combineFeatureHtml, syncRegistry } = require('../scripts/sync-registry.js');

// Test 1: combineFeatureHtml preserves special $ replacement tokens in JS/CSS
const sampleHtml = '<!DOCTYPE html><html><head><link rel="stylesheet" href="style.css"></head><body><script src="script.js"></script></body></html>';
const sampleCss = '.box { content: "$& $1"; }';
const sampleJs = 'const str = "price $100 $& $\'"; console.log(str);';
const combined = combineFeatureHtml(sampleHtml, sampleCss, sampleJs);
assert(combined.includes('const str = "price $100 $& $\'";'), 'JS special $ tokens must not be corrupted');
assert(combined.includes('.box { content: "$& $1"; }'), 'CSS special $ tokens must not be corrupted');
assert(!combined.includes('href="style.css"'), 'External style.css link should be replaced');
assert(!combined.includes('src="script.js"'), 'External script.js tag should be replaced');

console.log('Unit tests for combineFeatureHtml passed.');
