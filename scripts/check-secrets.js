#!/usr/bin/env node
/**
 * Secret scan: looks for keys, tokens and private keys in the files git tracks (or, with --staged, in what is about to
 * be committed), so a secret never reaches the repository or a deploy.
 *   npm run check-secrets [-- --staged] [--history]
 * --history scans every commit's added lines once (slow on a big history; run it before going public).
 * A finding can be waived in .secrets-allow.json: [{ "file": "path", "rule": "id", "reason": "why", "expires": "YYYY-MM-DD" }]
 * Found values are never printed in full.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKIP_EXT = /\.(png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|mp3|wav|mp4|webm|zip|pdf|db|rvf|lock)$/i;
const MAX_BYTES = 1024 * 1024;

const PLACEHOLDER = /(example|your[_-]|xxxx|changeme|placeholder|<[^>]+>|\$\{|process\.env|dummy|sample|test_key_not_real|\.\.\.)/i;

/** Rules that are specific enough to run over every file, bundles included. */
const RULES = [
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/ },
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'stripe-secret-key', re: /\b(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{16,}\b/ },
  { id: 'stripe-webhook-secret', re: /\bwhsec_[0-9a-zA-Z]{16,}\b/ },
  { id: 'github-token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  { id: 'slack-token', re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'resend-api-key', re: /\bre_[A-Za-z0-9]{8}_[A-Za-z0-9]{20,}\b/ },
  { id: 'sendgrid-key', re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/ }
];

/** Looser rule for hand-written source: a secret-looking name assigned a long literal. Skipped for minified bundles. */
const ASSIGNMENT = /\b(?:secret|passw(?:or)?d|passwd|api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret|service[_-]?role)\w*\s*[:=]\s*(['"`])([^'"`\s]{16,})\1/i;

function decodeJwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return payload.role || '';
  } catch (_) { return ''; }
}

function isBundle(text) {
  return text.length > 200000 || /^\s*\(\(\)=>\{var /.test(text) || /__commonJS|__esm\(/.test(text.slice(0, 4000));
}

/** Findings for one text: [{ rule, line, sample }] with the sample masked. */
function scanText(text) {
  const out = [];
  const bundle = isBundle(text);
  const mask = (s) => (s.length <= 8 ? '****' : s.slice(0, 4) + '…' + s.slice(-2));
  text.split('\n').forEach((line, i) => {
    if (line.length > 4000 && bundle) line = line.slice(0, 4000);
    RULES.forEach(r => {
      const m = r.re.exec(line);
      if (m && !PLACEHOLDER.test(m[0])) out.push({ rule: r.id, line: i + 1, sample: mask(m[0]) });
    });
    const jwt = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.exec(line);
    if (jwt && decodeJwtRole(jwt[0]) === 'service_role') out.push({ rule: 'supabase-service-role-key', line: i + 1, sample: mask(jwt[0]) });
    if (!bundle) {
      const a = ASSIGNMENT.exec(line);
      if (a && !PLACEHOLDER.test(a[2]) && !/^[A-Za-z]+$/.test(a[2]) && /\d/.test(a[2])) out.push({ rule: 'secret-assignment', line: i + 1, sample: mask(a[2]) });
    }
  });
  return out;
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 });
}

function allowed() {
  const file = path.join(ROOT, '.secrets-allow.json');
  if (!fs.existsSync(file)) return [];
  const today = new Date().toISOString().slice(0, 10);
  return JSON.parse(fs.readFileSync(file, 'utf8')).filter(a => a.reason && a.expires && a.expires >= today);
}

function scanFiles(files, readFile) {
  const waived = allowed();
  const findings = [];
  files.forEach(f => {
    if (SKIP_EXT.test(f) || f === 'package-lock.json' || f.startsWith('graphify-out/')) return;
    let text;
    try { text = readFile(f); } catch (_) { return; }
    if (text === null || text.length > MAX_BYTES * 4 || text.includes('\u0000')) return;
    scanText(text).forEach(x => {
      if (!waived.some(w => w.file === f && w.rule === x.rule)) findings.push({ file: f, ...x });
    });
  });
  return findings;
}

function scanHistory() {
  const findings = [];
  const log = git(['log', '--all', '-p', '--no-color', '--unified=0', '--diff-filter=AM', '--', '.', ':!package-lock.json']);
  let file = '';
  log.split('\n').forEach((line, i) => {
    if (line.startsWith('+++ b/')) { file = line.slice(6); return; }
    if (!line.startsWith('+') || line.startsWith('+++') || SKIP_EXT.test(file)) return;
    scanText(line.slice(1)).forEach(x => findings.push({ file: file + ' (history)', rule: x.rule, line: i + 1, sample: x.sample }));
  });
  return findings;
}

if (require.main === module) {
  const staged = process.argv.includes('--staged');
  let findings;
  if (process.argv.includes('--history')) findings = scanHistory();
  else if (staged) {
    const names = git(['diff', '--cached', '--name-only', '--diff-filter=ACM']).split('\n').filter(Boolean);
    findings = scanFiles(names, f => { try { return git(['show', ':' + f]); } catch (_) { return null; } });
  } else {
    const names = git(['ls-files']).split('\n').filter(Boolean);
    findings = scanFiles(names, f => {
      const p = path.join(ROOT, f);
      return fs.existsSync(p) && fs.statSync(p).size <= MAX_BYTES ? fs.readFileSync(p, 'utf8') : null;
    });
  }
  if (findings.length) {
    console.error(`✗ ${findings.length} possible secret(s):`);
    findings.slice(0, 40).forEach(f => console.error(`  ${f.file}:${f.line}  ${f.rule}  ${f.sample}`));
    console.error('Remove the value and rotate the key. If it is a false positive, add it to .secrets-allow.json with a reason and an expiry date.');
    process.exit(1);
  }
  console.log('✓ no secrets found' + (staged ? ' in staged files' : process.argv.includes('--history') ? ' in the git history' : ' in tracked files'));
}

module.exports = { scanText, scanFiles };
