#!/usr/bin/env node
// Plan E16.5: every HTML-string assignment in the builder and catalogue code (innerHTML =, outerHTML =, insertAdjacentHTML)
// is either provably safe by shape or has a written verdict in docs/security/innerhtml-verdicts.json.
//   npm run check-innerhtml            fails on any site that is neither
//   npm run check-innerhtml -- --list  prints every site with its class
// A site is "safe by shape" when it clears an element (''), assigns a constant string, or every ${...} / + part is passed through
// escapeHtml(...) or is a plain number (index, length, count). Anything else needs a verdict: fixed, safe (with the reason), or waived.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['app.js', 'builder.js', 'registry.js'];
const DIRS = ['scripts'];
const SKIP = /^scripts\/(check-|lib\/|new-feature|sync-registry|make-thumbs|bundle-demo|clean-features|build-tailwind|measure|find-|declare|localize|encode|setup|rank|refine|suggest|audit|set-license|lint|serve|ci\.js|write-)/;
const SINK = /(?:\.innerHTML\s*\+?=|\.outerHTML\s*=|\.insertAdjacentHTML\s*\()/g;

function listFiles() {
  const out = FILES.filter((f) => fs.existsSync(path.join(ROOT, f)));
  const walk = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = d + '/' + e.name; if (e.isDirectory()) walk(rel); else if (e.name.endsWith('.js') && !SKIP.test(rel)) out.push(rel); } };
  DIRS.forEach(walk);
  return out;
}

/** The text of the statement that starts at index i: up to the first ; or closing ) outside of strings and ${}. */
function statementAt(src, i) {
  let depth = 0, j = i; const stack = [];
  for (; j < src.length; j++) {
    const c = src[j], top = stack[stack.length - 1];
    if (top === "'" || top === '"') { if (c === '\\') j++; else if (c === top) stack.pop(); continue; }
    if (top === '`') { if (c === '\\') j++; else if (c === '`') stack.pop(); else if (c === '$' && src[j + 1] === '{') { stack.push('${'); j++; } continue; }
    if (top === '${') { if (c === '}') { stack.pop(); continue; } }
    if (c === "'" || c === '"' || c === '`') { stack.push(c); continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth < 0) break; }
    else if (c === ';' && depth === 0 && !stack.length) break;
    else if (c === '\n' && depth === 0 && !stack.length && /[)\]}'"`\w]\s*$/.test(src.slice(i, j)) && !/[+,(=?:&|]\s*$/.test(src.slice(i, j))) { /* ASI */ break; }
  }
  return src.slice(i, j);
}

const stripStrings = (s) => s.replace(/`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, '""');
const isNumberish = (e) => /^\s*(?:\(?\s*[\w.]*(?:index|idx|length|count|total|size|n|i|j|k)\s*(?:[+-]\s*\d+\s*)?\)?|\d+)\s*$/.test(e) && !/[()]\w+\(/.test(e);

/** 'empty' | 'constant' | 'escaped' | 'review' */
function classify(stmt) {
  const rhs = stmt.replace(/^[^=(]*?(?:=|\()\s*/, '');
  const body = rhs.replace(/\)\s*$/, '');
  if (/^\s*(['"`])\1\s*$/.test(body)) return 'empty';
  // every dynamic part of a template literal
  const dyn = []; let hasDyn = false;
  const re = /\$\{((?:[^{}]|\{[^{}]*\})*)\}/g; let m;
  const inner = body.replace(re, (all, e) => { hasDyn = true; dyn.push(e); return '""'; });
  const plusParts = stripStrings(inner).split(/\+/).map((x) => x.trim()).filter(Boolean);
  const literalOnly = plusParts.every((p) => p === '""');
  const hasOtherIdent = /[A-Za-z_$][\w$.]*/.test(stripStrings(inner).replace(/\b(?:true|false|null|undefined)\b/g, ''));
  if (!hasDyn && literalOnly && !hasOtherIdent) return 'constant';
  const safeExpr = (e) => /^\s*escapeHtml\(/.test(e) && balanced(e) || isNumberish(e);
  if (hasDyn && dyn.every(safeExpr) && !hasOtherIdent) return 'escaped';
  if (!hasDyn) { // string pieces joined with +
    const parts = splitTop(body, '+');
    if (parts.every((p) => /^\s*(['"`])(?:\\.|(?!\1)[^\\])*\1\s*$/.test(p) && !/\$\{/.test(p) || safeExpr(p))) return 'escaped';
  }
  return 'review';
}
function balanced(e) { let d = 0; for (const c of e.trim()) { if (c === '(') d++; if (c === ')') d--; if (d === 0 && c === ')') return e.trim().endsWith(')') && e.trim().lastIndexOf(')') === e.trim().length - 1; } return true; }
function splitTop(s, sep) { const out = []; let d = 0, cur = '', q = null; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { cur += c; if (c === '\\') { cur += s[++i]; } else if (c === q) q = null; continue; } if (c === "'" || c === '"' || c === '`') { q = c; cur += c; continue; } if ('([{'.includes(c)) d++; if (')]}'.includes(c)) d--; if (c === sep && d === 0) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; }

function scan() {
  const sites = [];
  for (const f of listFiles()) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8'); let m; SINK.lastIndex = 0;
    while ((m = SINK.exec(src))) {
      const line = src.slice(0, m.index).split('\n').length;
      const stmt = statementAt(src, m.index).replace(/\s+/g, ' ').trim();
      sites.push({ file: f, line, stmt, kind: classify(stmt), key: stmt.slice(0, 90) });
    }
  }
  return sites;
}

function main() {
  const verdicts = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'security', 'innerhtml-verdicts.json'), 'utf8')).verdicts;
  const sites = scan(), byKey = new Map(verdicts.map((v) => [v.file + '|' + v.key, v]));
  if (process.argv.includes('--list')) { for (const s of sites) console.log(`${s.kind.padEnd(8)} ${s.file}:${s.line}  ${s.stmt.slice(0, 110)}`); }
  const open = sites.filter((s) => s.kind === 'review' && !byKey.has(s.file + '|' + s.key));
  const stale = verdicts.filter((v) => !sites.some((s) => s.file === v.file && s.key === v.key));
  const counts = sites.reduce((a, s) => { a[s.kind] = (a[s.kind] || 0) + 1; return a; }, {});
  console.log(`${sites.length} HTML-string sites: ${counts.empty || 0} clear an element, ${counts.constant || 0} constant, ${counts.escaped || 0} escaped or numeric, ${counts.review || 0} need a verdict (all have one)`);
  if (stale.length) console.error('verdicts that match no site (remove them): ' + stale.map((v) => v.file + ' ' + v.key.slice(0, 40)).join(' | '));
  if (open.length) { console.error(`${open.length} site(s) need a verdict in docs/security/innerhtml-verdicts.json:\n` + open.map((s) => `  ${s.file}:${s.line}  ${s.stmt.slice(0, 140)}`).join('\n')); }
  const bad = verdicts.filter((v) => !['safe', 'fixed', 'waived'].includes(v.verdict) || !v.reason || v.reason.length < 15);
  if (bad.length) console.error('verdicts need verdict safe|fixed|waived and a reason: ' + bad.map((v) => v.file).join(', '));
  process.exit(open.length || stale.length || bad.length ? 1 : 0);
}
if (require.main === module) main();
module.exports = { scan, classify, statementAt };
