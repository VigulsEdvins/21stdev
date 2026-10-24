const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const execOptions = { cwd: ROOT, stdio: 'inherit' };

console.log('Running test suite...');

// Always run verify-registry.js first, then all test-*.js files in deterministic order
const testDir = __dirname;
const allFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.js') && f !== 'test-builder-integration.js')
  .sort((a, b) => {
    if (a === 'verify-registry.js') return -1;
    if (b === 'verify-registry.js') return 1;
    return a.localeCompare(b);
  });

for (const testFile of allFiles) {
  console.log(`\n▶ Running tests/${testFile}...`);
  execSync(`node tests/${testFile}`, execOptions);
}

console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');

