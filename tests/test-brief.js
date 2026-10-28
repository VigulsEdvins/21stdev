/** brief_v1: the checker accepts the valid samples and rejects each broken one for the right reason; the JSON schema file is current. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const B = require('../site/js/brief.js');
const dir = path.join(__dirname, 'data', 'briefs');
const reasons = { 'invalid-contradictory': 'I don’t know yet', 'invalid-bad-choice': 'not an allowed choice', 'invalid-too-many-feel': 'at most 3', 'invalid-wrong-version': 'v must be 1', 'invalid-extra-field': 'unknown field', 'invalid-not-a-question': 'not a question' };
let n = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const name = f.replace('.json', ''), errs = B.check(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  if (name.startsWith('valid')) assert.deepStrictEqual(errs, [], name + ' should be valid: ' + errs.join('; '));
  else assert(errs.some((e) => e.includes(reasons[name])), name + ' should be rejected for “' + reasons[name] + '”, got: ' + errs.join('; '));
  n++;
}
for (const bad of [null, [], 'x', 5, { v: 1 }, { v: 1, answers: [] }, { v: 1, answers: { kind: { value: 'x'.repeat(201), unknown: false } } }, { v: 1, answers: { kind: { value: 5, unknown: false } } }, { v: 1, answers: { blocks: { value: ['banner', 'banner'], unknown: false } } }, { v: 1, answers: { kind: { value: 'a', unknown: 'no' } } }]) assert(B.check(bad).length, 'malformed rejected: ' + JSON.stringify(bad).slice(0, 60));
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'schema', 'brief_v1.schema.json'), 'utf8'));
assert.deepStrictEqual(schema, B.jsonSchema(), 'docs/schema/brief_v1.schema.json is out of date: run node scripts/write-brief-schema.js');
const r = B.readable(JSON.parse(fs.readFileSync(path.join(dir, 'valid-complete.json'), 'utf8')));
assert.strictEqual(r.length, 10); assert.strictEqual(r[3].text, 'Opening banner, About you, What you offer, Prices, Contact form');
console.log(`✓ brief_v1: ${n} sample briefs, 10 malformed inputs, schema file current`);
