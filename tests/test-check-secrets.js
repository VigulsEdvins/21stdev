// Secret scanner: finds real-looking keys, ignores placeholders and bundles' generic matches, never prints a whole key.
const assert = require('assert');
const { scanText } = require('../scripts/check-secrets.js');

// fake keys are assembled here so this file does not contain one itself
const stripe = 'sk_' + 'live_' + 'abcdefghij0123456789ABCD';
const aws = 'AKIA' + 'ABCDEFGHIJKLMNOP';
const gh = 'ghp_' + 'a'.repeat(36);
const pk = '-----BEGIN ' + 'RSA PRIVATE KEY-----';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (role) => b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ role, iss: 'supabase' }) + '.' + 'sig'.repeat(5);

const rules = (text) => scanText(text).map(f => f.rule);
assert.deepStrictEqual(rules(`const k = "${stripe}";`), ['stripe-secret-key']);
assert.deepStrictEqual(rules(`aws=${aws}`), ['aws-access-key']);
assert.deepStrictEqual(rules(gh), ['github-token']);
assert.deepStrictEqual(rules(pk), ['private-key']);
assert.deepStrictEqual(rules(`SUPABASE=${jwt('service_role')}`), ['supabase-service-role-key']);
assert.deepStrictEqual(rules(`SUPABASE_ANON=${jwt('anon')}`), [], 'the public anon key is not a secret');
assert.deepStrictEqual(rules('const apiKey = "a1b2c3d4e5f6a7b8c9d0e1f2";'), ['secret-assignment']);
assert.deepStrictEqual(rules('const apiKey = process.env.API_KEY;'), []);
assert.deepStrictEqual(rules('const apiKey = "your-api-key-goes-here-123";'), [], 'placeholders are ignored');
assert.deepStrictEqual(rules('password: "correcthorsebattery"'), [], 'letters-only values are words, not keys');
assert.deepStrictEqual(rules('pk_' + 'live_' + 'abcdefghij0123456789ABCD'), [], 'publishable keys are public');

const masked = scanText(`x = "${stripe}"`)[0].sample;
assert(!masked.includes(stripe) && masked.length < 12, 'the key is masked: ' + masked);

const bundle = '(()=>{var ' + 'a'.repeat(10) + '=1;' + 'x'.repeat(10) + '})();\n' + 'secret="a1b2c3d4e5f6a7b8c9d0e1f2"';
assert.deepStrictEqual(rules(bundle), [], 'generic assignments are not reported inside minified bundles');
assert.deepStrictEqual(rules(`(()=>{var q=1;})();${stripe}`), ['stripe-secret-key'], 'specific key formats are reported everywhere');
console.log('✅ Secret scanner tests passed!');
