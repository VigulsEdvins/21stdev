#!/usr/bin/env node
/** Visible strings of a template page (text nodes, alt, placeholder, title) as raw HTML, for translation: node scripts/preview/extract-strings.js <slug> */
const fs = require('fs');
const path = require('path');

function strings(html) {
  const body = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, m => m.replace(/[^<>]/g, ' '));
  const out = new Set();
  for (const m of body.matchAll(/>([^<>]+)</g)) { const t = m[1].trim(); if (/[A-Za-z]{2}/.test(t)) out.add(t); }
  for (const m of body.matchAll(/\b(?:alt|placeholder|aria-label|title)="([^"]+)"/g)) if (/[A-Za-z]{2}/.test(m[1])) out.add(m[1]);
  return [...out];
}

/** Apply a dictionary: text nodes and attribute values equal to a key become its value. */
function translate(html, dict) {
  const keep = [];
  const prot = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, m => { keep.push(m); return '\u0000' + (keep.length - 1) + '\u0000'; });
  const out = prot
    .replace(/>([^<>]+)</g, (m, t) => { const k = t.trim(); return k in dict ? '>' + t.replace(k, dict[k]) + '<' : m; })
    .replace(/\b(alt|placeholder|aria-label|title)="([^"]+)"/g, (m, a, v) => (v in dict ? a + '="' + dict[v] + '"' : m));
  return out.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i]);
}

if (require.main === module) {
  const slug = process.argv[2];
  console.log(JSON.stringify(strings(fs.readFileSync(path.join(__dirname, '..', '..', 'features', slug, 'index.html'), 'utf8')), null, 1));
}
module.exports = { strings, translate };
