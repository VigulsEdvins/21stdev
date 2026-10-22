const { execSync } = require('child_process');
const assert = require('assert');

console.log('Running test suite...');
execSync('node tests/verify-registry.js', { stdio: 'inherit' });
execSync('node tests/test-assembler.js', { stdio: 'inherit' });
execSync('node tests/test-builder-dom.js', { stdio: 'inherit' });
execSync('node tests/test-builder-state.js', { stdio: 'inherit' });
execSync('node tests/test-preview-generation.js', { stdio: 'inherit' });
execSync('node tests/test-export-generation.js', { stdio: 'inherit' });

console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
