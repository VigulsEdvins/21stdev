#!/usr/bin/env node
/**
 * Writes the sharing tags (Open Graph and Twitter card) into the head of every public page of site/, from the page's
 * own title, description and canonical address. Safe to run again: the block between the markers is replaced.
 *   node scripts/add-sharing-tags.js          write
 *   node scripts/add-sharing-tags.js --check  fail if any page is out of date (used by npm run check-sharing)
 */
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..', 'site');
const PAGES = ['index.html', 'how-it-works/index.html', 'pricing/index.html', 'faq/index.html', 'contact/index.html', 'start/index.html', 'guide/index.html', 'about/index.html'];
const START = '<!-- sharing:start -->', END = '<!-- sharing:end -->';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const ORG = { '@context': 'https://schema.org', '@type': 'Organization', name: 'edvlabs', url: 'https://edvlabs.com/', logo: 'https://edvlabs.com/img/og.png', address: { '@type': 'PostalAddress', addressCountry: 'LV' } };

function block(html, file) {
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1];
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  const url = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!title || !desc || !url) throw new Error(file + ': needs a title, a description and a canonical address');
  const tags = [
    START,
    '<meta property="og:site_name" content="edvlabs">',
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${esc(unesc(title))}">`,
    `<meta property="og:description" content="${desc}">`,
    `<meta property="og:url" content="${url}">`,
    '<meta property="og:image" content="https://edvlabs.com/img/og.png">',
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="edvlabs: a good page for a good small business, with a sun over an arch">',
    '<meta name="twitter:card" content="summary_large_image">'
  ];
  if (file === 'index.html') tags.push('<script type="application/ld+json">' + JSON.stringify(ORG).replace(/</g, '\\u003c') + '</script>');
  tags.push(END);
  return tags.join('\n');
}

function render(file) {
  let html = fs.readFileSync(path.join(SITE, file), 'utf8');
  html = html.replace(new RegExp('\\n?' + START + '[\\s\\S]*?' + END), '');
  html = html.replace(/<meta property="og:[^>]*>/g, ''); // older hand-written tags
  const head = block(html, file);
  return html.replace(/(<link rel="canonical"[^>]*>)/, `$1\n${head}`);
}

const check = process.argv.includes('--check');
let bad = 0;
PAGES.forEach((f) => {
  const next = render(f), p = path.join(SITE, f);
  if (check) { if (fs.readFileSync(p, 'utf8') !== next) { console.error('✗ out of date: site/' + f); bad++; } }
  else fs.writeFileSync(p, next);
});
if (check) {
  if (!fs.existsSync(path.join(SITE, 'img', 'og.png'))) { console.error('✗ site/img/og.png is missing'); bad++; }
  console.log(bad ? `${bad} problem(s)` : '✓ sharing tags up to date on ' + PAGES.length + ' pages');
  process.exit(bad ? 1 : 0);
}
console.log('wrote sharing tags on ' + PAGES.length + ' pages');
