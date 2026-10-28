// Static security analysis (E16.4). Only rules that find real injection and code-execution risks, not style.
// `npm run security:static` fails on any finding that is not in eslint-suppressions.json (the reviewed baseline),
// so a new unsafe pattern is caught while the old, already-triaged ones do not block work.
const noUnsanitized = require('eslint-plugin-no-unsanitized');
const security = require('eslint-plugin-security');
const globals = require('globals');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'graphify-out/**', 'reports/**', 'thumbs/**', 'assets/**', 'site/examples/**', 'features/**', 'scripts/vendor/**', '**/*.min.js', '.claude/**']
  },
  {
    files: ['builder.js', 'app.js', 'registry.js', 'scripts/**/*.js', 'site/js/**/*.js', 'functions/**/*.js', 'src/**/*.js'],
    plugins: { 'no-unsanitized': noUnsanitized, security },
    languageOptions: { ecmaVersion: 2024, sourceType: 'script', globals: { ...globals.browser, ...globals.node, ...globals.es2021 } },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-child-process': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-no-csrf-before-method-override': 'error'
    }
  },
  { files: ['functions/**/*.js', 'src/**/*.js'], languageOptions: { sourceType: 'module' } },
  {
    // file names built from a web request: only the servers answer requests; build scripts read their own folders
    files: ['scripts/serve.js', 'scripts/dev-site.js', 'src/**/*.js', 'functions/**/*.js'],
    plugins: { security },
    rules: { 'security/detect-non-literal-fs-filename': 'error' }
  }
];
