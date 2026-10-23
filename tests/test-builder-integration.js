const { execSync } = require('child_process');
const path = require('path');

const execOptions = { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' };

console.log('Running test suite...');
execSync('node tests/verify-registry.js', execOptions);
execSync('node tests/test-assembler.js', execOptions);
execSync('node tests/test-builder-dom.js', execOptions);
execSync('node tests/test-builder-state.js', execOptions);
execSync('node tests/test-builder-elements.js', execOptions);
execSync('node tests/test-universal-theming.js', execOptions);
execSync('node tests/test-section-sizing.js', execOptions);
execSync('node tests/test-creative-widgets.js', execOptions);
execSync('node tests/test-elements-catalog.js', execOptions);
execSync('node tests/test-preview-generation.js', execOptions);
execSync('node tests/test-export-generation.js', execOptions);

console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
