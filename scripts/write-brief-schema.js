#!/usr/bin/env node
// Rewrites docs/schema/brief_v1.schema.json from the questions. Run after changing site/js/questions.js.
const fs = require('fs'); const path = require('path');
const B = require('../site/js/brief.js');
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'schema', 'brief_v1.schema.json'), JSON.stringify(B.jsonSchema(), null, 2) + '\n');
console.log('wrote docs/schema/brief_v1.schema.json');
