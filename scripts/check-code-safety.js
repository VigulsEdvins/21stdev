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

/**
 * The same hard rules for the project's own code (the builder, the public site, the server functions), plus two about messages:
 * a 'message' listener must look at event.origin or event.source, and postMessage(..., '*') needs a `postmessage-ok:` reason on that line.
 */
function scanOwn(file, text) {
  const findings = [];
  RULES.forEach(r => { if (r.re.test(text)) findings.push({ file, rule: r.id, msg: r.msg }); });
  const listener = /addEventListener\(\s*["']message["']/g;
  let m;
  while ((m = listener.exec(text))) {
    if (!/\.(origin|source)\b/.test(text.slice(m.index, m.index + 600))) findings.push({ file, rule: 'message-origin', msg: "'message' listener that checks neither event.origin nor event.source" });
  }
  text.split('\n').forEach((line, i) => {
    if (/\bpostMessage\s*\([^;]*,\s*['"]\*['"]\s*\)/.test(line) && !/postmessage-ok:/.test(line)) findings.push({ file: file + ':' + (i + 1), rule: 'post-any-origin', msg: "postMessage to '*' without a postmessage-ok: reason" });
  });
  return findings;
}

function ownFiles() {
  const root = path.join(__dirname, '..');
  const out = [path.join(root, 'builder.js')];
  const walk = (dir, filter) => { if (!fs.existsSync(dir)) return; for (const n of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, n.name); if (n.isDirectory()) walk(p, filter); else if (filter(n.name)) out.push(p); } };
  walk(path.join(root, 'scripts'), n => n.endsWith('.js') && !/^check-|^\.tmp/.test(n));
  walk(path.join(root, 'site', 'js'), n => n.endsWith('.js'));
  walk(path.join(root, 'functions'), n => n.endsWith('.js'));
  walk(path.join(root, 'src'), n => n.endsWith('.js'));
  return out;
}

// Findings in the project's own code that were looked at and accepted, each with the reason. Anything else fails.
const OWN_WAIVERS = [
  { file: 'scripts/assembler.js', rule: 'eval', reason: 'the text "eval(" is a pattern the Content-Security-Policy generator searches section scripts for; the file never calls eval' },
  { file: 'scripts/builder/react-export.js', rule: 'new-function', reason: 'the React export wraps a section\'s own script in a component and starts it with new Function; the script is the vault\'s code that the plain page ships too, never visitor input' }
];

function scanProject() {
  const root = path.join(__dirname, '..');
  const findings = [];
  ownFiles().forEach(f => scanOwn(path.relative(root, f), fs.readFileSync(f, 'utf8')).forEach(x => {
    const w = OWN_WAIVERS.find(o => o.file === x.file && o.rule === x.rule);
    findings.push(w ? Object.assign({}, x, { waived: true, reason: w.reason }) : x);
  }));
  return findings;
}

module.exports = { scan, scanText, scanOwn, scanProject, isBundle, ALLOWED_SCRIPT_HOSTS };

if (require.main === module) {
  const all = scan().concat(scanProject());
  const open = all.filter(f => !f.waived);
  all.forEach(f => console.log(`${f.waived ? '~' : '✗'} ${f.file}: ${f.msg}${f.reason ? ' (waived: ' + f.reason + ')' : ''}`));
  console.log(`${open.length} open finding(s), ${all.length - open.length} waived`);
  process.exit(open.length ? 1 : 0);
}
