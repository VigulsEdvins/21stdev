const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Testing bundled video fallbacks...');
const lib = path.resolve(__dirname, '../assets/library');
const webms = fs.readdirSync(lib).filter(f => f.endsWith('.webm'));
assert(webms.length > 0, 'there is a bundled WebM to check');
for (const w of webms) {
  const mp4 = w.replace(/\.webm$/, '.mp4');
  assert(fs.existsSync(path.join(lib, mp4)), `${w} has an MP4 fallback next to it (H.264 for browsers without VP8)`);
  const owners = require('../registry.json').items.filter(i => (i.exportAssets || []).includes('/assets/library/' + mp4));
  assert(owners.length > 0, `${mp4} is listed as an export asset so a ZIP carries it`);
}
console.log('✅ Video fallback tests passed!');
