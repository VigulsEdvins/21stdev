#!/usr/bin/env node
// Static safety scan of features/*: patterns that run strings as code or load code from elsewhere.
//   hard rules (fail):   eval(), new Function(), document.write(), <script src> or import() from a host that is not
//                         allow-listed, a 'message' listener that never looks at event.origin (hand-written files only)
//   a feature may carry `safetyReviewed: "reason"` in meta.json to waive a hard finding it cannot avoid.
//   npm run check-code-safety
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'features');
const ALLOWED_SCRIPT_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'esm.sh', 'fonts.googleapis.com'];

const RULES = [
  { id: 'eval', re: /\beval\s*\(/, msg: 'eval()' },
  { id: 'new-function', re: /\bnew\s+Function\s*\(/, msg: 'new Function()' },
  { id: 'document-write', re: /\bdocument\.write(ln)?\s*\(/, msg: 'document.write()' }
];

function isBundle(text) {
  return /^\s*\(\(\)=>\{var /.test(text) || /__commonJS|__esm\(/.test(text.slice(0, 4000)) || text.length > 200000;
}

function scanText(file, text) {
  const findings = [];
  RULES.forEach(r => { if (r.re.test(text)) findings.push({ file, rule: r.id, msg: r.msg }); });
  const re = /<script\b[^>]*\bsrc\s*=\s*["'](https?:)?\/\/([^/"']+)/gi;
  let m;
  while ((m = re.exec(text))) {
    if (!ALLOWED_SCRIPT_HOSTS.includes(m[2].toLowerCase())) findings.push({ file, rule: 'remote-script', msg: 'script from ' + m[2] });
  }
  const dyn = /\bimport\s*\(\s*["'`]https?:\/\/([^/"'`]+)/g;
  while ((m = dyn.exec(text))) {
    if (!ALLOWED_SCRIPT_HOSTS.includes(m[1].toLowerCase())) findings.push({ file, rule: 'remote-import', msg: 'import() from ' + m[1] });
  }
  if (!isBundle(text)) {
    const listener = /addEventListener\(\s*["']message["']/g;
    while ((m = listener.exec(text))) {
      if (!/\.origin\b/.test(text.slice(m.index, m.index + 600))) findings.push({ file, rule: 'message-origin', msg: "'message' listener without an event.origin check" });
    }
  }
  return findings;
}

function scan() {
  const findings = [];
  for (const slug of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    let waived = false;
    try { waived = !!JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')).safetyReviewed; } catch (_) { /* no meta */ }
    for (const f of ['index.html', 'script.js', 'component.tsx', 'demo.tsx']) {
      const p = path.join(dir, f);
      if (!fs.existsSync(p)) continue;
      scanText(`${slug}/${f}`, fs.readFileSync(p, 'utf8')).forEach(x => findings.push({ ...x, slug, waived }));
    }
  }
  return findings;
}

module.exports = { scan, scanText, isBundle, ALLOWED_SCRIPT_HOSTS };

if (require.main === module) {
  const all = scan();
  const open = all.filter(f => !f.waived);
  all.forEach(f => console.log(`${f.waived ? '~' : '✗'} ${f.file}: ${f.msg}`));
  console.log(`${open.length} open finding(s), ${all.length - open.length} waived`);
  process.exit(open.length ? 1 : 0);
}
