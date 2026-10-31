/** The buying overlay's pure parts: which options a destination has, and that the order sent to the server holds choices only (never a price). */
const assert = require('assert');
const G = require('../scripts/builder/guided-buy.js');

assert.deepStrictEqual(G.optionsFor('edvlabs'), { name: true, hosting: true, deployHelp: false });
assert.deepStrictEqual(G.optionsFor('domain'), { name: false, hosting: true, deployHelp: true });
assert.deepStrictEqual(G.optionsFor('download'), { name: false, hosting: false, deployHelp: true });
assert.deepStrictEqual(G.optionsFor('moon'), { name: false, hosting: false, deployHelp: false });

const s = { projectId: 'pid', destination: 'download', editor: 1, hosting: 'yearly', deployHelp: true, siteName: 'left-over-name', price: 1, payToday: 1 };
assert.deepStrictEqual(G.orderFrom(s), { projectId: 'pid', destination: 'download', editor: true, hosting: null, deployHelp: true }, 'a download carries no hosting and no name');
assert.deepStrictEqual(G.orderFrom({ ...s, destination: 'edvlabs' }), { projectId: 'pid', destination: 'edvlabs', editor: true, hosting: 'yearly', deployHelp: false, siteName: 'left-over-name' }, 'deploy help is dropped on an edvlabs address');
for (const o of [G.orderFrom(s), G.orderFrom({ ...s, destination: 'domain' })]) assert(!('price' in o) && !('payToday' in o), 'no price in an order');
console.log('✓ guided buy: options and order');
