#!/usr/bin/env node
/**
 * Writes site/guide/index.html from scripts/deploy-guide.js, the same text that is inside every download (plan E7.8).
 * `--check` fails when the page on disk is out of date (part of `npm test`). The sharing tags are added by add-sharing-tags.js.
 */
const fs = require('fs');
const path = require('path');
const guide = require('./deploy-guide.js');

const FILE = path.join(__dirname, '..', 'site', 'guide', 'index.html');
const faq = fs.readFileSync(path.join(__dirname, '..', 'site', 'faq', 'index.html'), 'utf8');
const TITLE = 'Put your page online yourself · edvlabs';
const DESC = 'A step-by-step guide to putting a page online: Netlify, Cloudflare Pages, GitHub Pages or an ordinary web host, your own domain, Google and contact forms.';

function build() {
  const icon = faq.match(/<link rel="icon"[^>]*>/)[0];
  const header = faq.match(/<div class="wrap"><header class="site-header">[\s\S]*?<\/header><\/div>/)[0].replace(' aria-current="page"', '').replace('href="../lv/faq/"', 'href="../lv/"'); // the guide has no Latvian twin: the switcher goes to the Latvian home page
  const footer = faq.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0].replace('href="../lv/faq/"', 'href="../lv/"');
  const toc = guide.CHAPTERS.map((c) => `<li><a href="#${c.id}">${c.title.replace(/&/g, '&amp;')}</a></li>`).join('');
  const existing = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : '';
  const sharing = (existing.match(/<!-- sharing:start -->[\s\S]*?<!-- sharing:end -->/) || ['<!-- sharing:start -->\n<!-- sharing:end -->'])[0];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<link rel="canonical" href="https://edvlabs.com/guide/">
${sharing}

${icon}
<link rel="stylesheet" href="../site.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header}
<main id="main">

<div class="wrap page-head"><span class="kicker">Guide</span><h1>Put your page online yourself.</h1></div>
<section class="wrap sec sec--flush guide">
<p>The same guide is inside every download. You do not need to buy anything from us to read it. It takes about 30 minutes the first time, and it never asks you to send us a password, API key or card number.</p>
<nav aria-label="Chapters"><ol>${toc}</ol></nav>
${guide.bodyHtml()}
<div class="btn-row mt-5"><a class="btn" href="../start/">Start your page</a><a class="btn btn--secondary" href="../contact/">Ask us for help</a></div>
</section>
</main>
${footer}

<script src="../js/nav-auth.js"></script>
</body>
</html>
`;
}

if (require.main === module) {
  const out = build();
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : '';
    if (now !== out) { console.error('site/guide/index.html is out of date: run node scripts/build-guide-page.js'); process.exit(1); }
    console.log('guide page is up to date');
  } else {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, out);
    console.log('wrote site/guide/index.html');
  }
}
module.exports = { build };
