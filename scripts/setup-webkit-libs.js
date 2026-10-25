#!/usr/bin/env node
/**
 * Fetches the few system libraries Playwright's WebKit needs on a newer Linux (ICU 74, libxml2.so.2) from the Ubuntu
 * 24.04 archive, and takes libjxl 0.8 and libbacktrace from the WebKit bundle itself, into
 * ~/.cache/web-for-options/webkit-libs. Nothing is installed system-wide and no root is needed. Needs `dpkg-deb`.
 *   npm run setup-webkit-libs
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DEBS = [
  'pool/main/i/icu/libicu74_74.2-1ubuntu3.1_amd64.deb',
  'pool/main/libx/libxml2/libxml2_2.9.14+dfsg-1.3ubuntu3.10_amd64.deb'
];
const out = path.join(os.homedir(), '.cache', 'web-for-options', 'webkit-libs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webkit-libs-'));

(async () => {
  fs.mkdirSync(out, { recursive: true });
  for (const rel of DEBS) {
    const res = await fetch('http://archive.ubuntu.com/ubuntu/' + rel);
    if (!res.ok) throw new Error(rel + ': HTTP ' + res.status);
    const deb = path.join(tmp, path.basename(rel));
    fs.writeFileSync(deb, Buffer.from(await res.arrayBuffer()));
    const root = path.join(tmp, path.basename(rel, '.deb'));
    execFileSync('dpkg-deb', ['-x', deb, root]);
    const lib = path.join(root, 'usr', 'lib', 'x86_64-linux-gnu');
    for (const f of fs.readdirSync(lib)) if (/^(libicu.*\.so\.74|libxml2\.so\.2)/.test(f)) fs.cpSync(path.join(lib, f), path.join(out, f), { recursive: true, force: true, verbatimSymlinks: true });
  }
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  const builds = fs.existsSync(base) ? fs.readdirSync(base).filter(d => /^webkit-\d+$/.test(d)).sort().reverse() : [];
  const sys = builds.map(d => path.join(base, d, 'minibrowser-gtk', 'sys', 'lib')).find(fs.existsSync);
  if (!sys) throw new Error('no Playwright WebKit build found (run: npx playwright install webkit)');
  for (const f of fs.readdirSync(sys)) if (/^(libjxl|libbacktrace)/.test(f)) fs.cpSync(path.join(sys, f), path.join(out, f), { force: true, verbatimSymlinks: true });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('WebKit libraries ready in ' + out + '. Run: BROWSER=webkit npm run check-cross-browser');
})().catch(e => { console.error(e.message); process.exit(1); });
