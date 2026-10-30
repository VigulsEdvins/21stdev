/**
 * The files around a page: the head (title, social tags, structured data), the content security policy, 404, security.txt, deploy files, favicon.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 * The code between the braces is not indented, so the template strings in it stay byte for byte as they were.
 */
(function () {
const { escapeHtml } = (typeof window !== 'undefined' && window.AsmUtil) || require('./util.js');

/** Organization / LocalBusiness data for search engines; '' when the page has no business type or name. */
function renderJsonLd(page = {}, title = '') {
  if (page.bizType !== 'Organization' && page.bizType !== 'LocalBusiness') return '';
  const name = String(page.bizName || '').trim();
  if (!name) return '';
  const absolute = (v) => { const s = String(v || '').trim(); return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : ''; };
  const data = { '@context': 'https://schema.org', '@type': page.bizType, name };
  if (absolute(page.canonical)) data.url = absolute(page.canonical);
  if (absolute(page.shareImage)) data.image = absolute(page.shareImage);
  if (String(page.description || '').trim()) data.description = String(page.description).trim();
  if (String(page.bizPhone || '').trim()) data.telephone = String(page.bizPhone).trim();
  if (validEmail(page.bizEmail)) data.email = String(page.bizEmail).trim();
  if (String(page.bizAddress || '').trim()) data.address = String(page.bizAddress).trim();
  // '<' is escaped so no value can close the script tag
  return '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>';
}

/**
 * Content-Security-Policy for the ZIP export. Scripts may only come from the page itself and the CDNs the page really
 * uses; inline event handlers, inline scripts or eval need a weaker rule and are named in `reasons` so the README can say so.
 */
function renderCsp(indexHtml = '', scriptJs = '', opts = {}) {
  const reasons = [];
  const hosts = new Set();
  const scriptSrcRe = /<script\b[^>]{0,500}\bsrc\s*=\s*["'](?:https?:)?\/\/([^/"']+)/gi;
  let m;
  while ((m = scriptSrcRe.exec(indexHtml))) hosts.add(m[1].toLowerCase());
  const importRe = /\bimport\s*\(\s*["'`]https?:\/\/([^/"'`]+)/g;
  while ((m = importRe.exec(scriptJs))) hosts.add(m[1].toLowerCase());
  const body = String(indexHtml).replace(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const scriptSrc = ["'self'", ...hosts];
  if (/\son[a-z]+\s*=\s*["']/i.test(body) || /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(body)) {
    scriptSrc.push("'unsafe-inline'");
    reasons.push('inline scripts or event handlers in a section');
  }
  if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(scriptJs)) {
    scriptSrc.push("'unsafe-eval'");
    reasons.push('eval() in a section script');
  }
  // Connections: when the page has message forms and no section script makes network calls of its own, only this site and the known
  // form services (plus the own address chosen for the forms) are allowed, so a script that slips in cannot send data anywhere else.
  const ownScript = opts.runtimeJs ? String(scriptJs).split(opts.runtimeJs).join('') : String(scriptJs);
  const networkRe = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/;
  const narrowConnect = !!opts.formsReady && !networkRe.test(ownScript) && !networkRe.test(body);
  const connectSrc = narrowConnect
    ? ["'self'", 'https://formsubmit.co', 'https://formspree.io', 'https://api.web3forms.com'].concat(opts.customHost ? [opts.customHost] : [])
    : ["'self'", 'https:', 'data:', 'blob:'];
  const policy = [
    "default-src 'self'",
    'script-src ' + scriptSrc.join(' '),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self' data: blob: https:",
    'connect-src ' + connectSrc.join(' '),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:"
  ].join('; ');
  return { policy, strict: reasons.length === 0, reasons, narrowConnect };
}

/** Where form messages go (scripts/form-delivery.js); null when that file is not loaded. */
function formDelivery() {
  return (typeof module !== 'undefined' && module.exports) ? require('../form-delivery.js') : (typeof window !== 'undefined' ? window.FormDelivery : null) || null;
}

/** The shared guide text (scripts/deploy-guide.js): a require in Node, a script tag in the builder. */
function deployGuide() {
  return (typeof module !== 'undefined' && module.exports) ? require('../deploy-guide.js') : window.DeployGuide;
}

/** Web address of the live page when it is a plain https:// or http:// address, else ''. */
function originOf(canonical) {
  const c = String(canonical || '').trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(c) ? c.replace(/^(https?:\/\/[^/]+).*$/i, '$1') : '';
}

function validEmail(v) {
  return /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]+$/.test(String(v || '').trim()) && !/[\r\n]/.test(String(v));
}

/** A "page not found" page the host shows for unknown addresses. Absolute links, because it is served at any path. */
function render404(page = {}) {
  const name = escapeHtml((page.title || '').trim() || 'This site');
  const lang = escapeHtml((page.lang || 'en').trim() || 'en');
  return `<!DOCTYPE html>\n<html lang="${lang}">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <meta name="robots" content="noindex">\n  <title>Page not found | ${name}</title>\n  <link rel="stylesheet" href="/style.css">\n</head>\n<body>\n  <main style="max-width:36rem;margin:15vh auto;padding:0 1rem;text-align:center">\n    <h1>Page not found</h1>\n    <p>The page you were looking for is not here. It may have moved.</p>\n    <p><a href="/">Go to the home page</a></p>\n  </main>\n</body>\n</html>\n`;
}

/** RFC 9116 contact file. Needs a valid email; expires one year after the export so it never goes stale unnoticed. */
function renderSecurityTxt(page = {}, now = new Date()) {
  const d = new Date(now); d.setUTCFullYear(d.getUTCFullYear() + 1);
  const origin = originOf(page.canonical);
  return `Contact: mailto:${String(page.bizEmail).trim()}\nExpires: ${d.toISOString().replace(/\.\d+Z$/, 'Z')}\nPreferred-Languages: ${String(page.lang || 'en').trim() || 'en'}\n` + (origin ? `Canonical: ${origin}/.well-known/security.txt\n` : '');
}

/** Names of the helper files that ride along with index.html in every download (the ZIP code copies whichever exist). */
const SITE_EXTRA_FILES = ['robots.txt', 'sitemap.xml', 'favicon.svg', 'site.webmanifest', '_headers', 'DEPLOY.md', 'DEPLOY.html', '404.html', '.well-known/security.txt'];

/** Host helper files: cache and security headers for Netlify / Cloudflare Pages, and plain deploy steps. */
function renderDeployFiles(page = {}, opts = {}) {
  const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate
`;
  const guide = deployGuide();
  const addr = originOf(page.canonical);
  const files = {
    '_headers': headers,
    'DEPLOY.md': guide.markdown({ address: addr }),
    'DEPLOY.html': guide.html({ address: addr }),
    '404.html': render404(page)
  };
  if (validEmail(page.bizEmail)) files['.well-known/security.txt'] = renderSecurityTxt(page, opts.now);
  return files;
}

/** robots.txt and sitemap.xml for a single-page export. The sitemap needs the live address, so it is skipped without one. */
function renderSiteFiles(page = {}, pageFiles = null) {
  const canonical = String(page.canonical || '').trim();
  const url = /^https?:\/\/[^\s"'<>]+$/i.test(canonical) ? canonical : '';
  const files = {};
  const icon = emojiFavicon(page);
  if (icon) {
    const name = (page.title || '').trim() || 'My site';
    files['favicon.svg'] = icon + '\n';
    files['site.webmanifest'] = JSON.stringify({ name, short_name: name.slice(0, 12), icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }, { src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }], display: 'browser' }, null, 2) + '\n';
  }
  if (page.robots === 'noindex') {
    files['robots.txt'] = 'User-agent: *\nDisallow: /\n';
    return files;
  }
  const origin = url ? url.replace(/^(https?:\/\/[^/]+).*$/i, '$1') : '';
  files['robots.txt'] = 'User-agent: *\nAllow: /\n' + (origin ? `\nSitemap: ${origin}/sitemap.xml\n` : '');
  if (url) {
    // one address per page: the home page is the live address itself, the others sit next to it
    const dir = url.replace(/[^/]*$/, '');
    const locs = Array.isArray(pageFiles) && pageFiles.length > 1
      ? pageFiles.map(f => (f === 'index.html' ? (/\.html?$/i.test(url) ? url : dir) : dir + f))
      : [url];
    files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs.map(l => `  <url><loc>${escapeHtml(l)}</loc></url>`).join('\n')}\n</urlset>\n`;
  }
  return files;
}

/** An emoji favicon becomes a real favicon.svg (and a web manifest) in an export; an image URL stays as it is. */
function emojiFavicon(page = {}) {
  const fav = (page.favicon || '').trim();
  if (!fav || /^(https?:|data:|\/|\.\/|[\w-]+\/)/i.test(fav) && !/^\p{Extended_Pictographic}/u.test(fav)) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${escapeHtml(fav)}</text></svg>`;
}

/**
 * Page-level settings (title, description, favicon, fonts) -> head tags and CSS.
 * @param {object} [page]
 * @param {string} [fallbackTitle]
 */
function renderPageHead(page = {}, fallbackTitle = 'Assembled Web Page', opts = {}) {
  const title = (page.title || '').trim() || fallbackTitle;
  const tags = [`<title>${escapeHtml(title)}</title>`];
  if ((page.description || '').trim()) {
    tags.push(`<meta name="description" content="${escapeHtml(page.description.trim())}">`);
  }

  // Sharing and search tags. Only absolute https:// (or http://) addresses are written: a relative share image
  // or canonical link is ignored by every crawler.
  const absolute = (v) => { const s = String(v || '').trim(); return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : ''; };
  const description = (page.description || '').trim();
  tags.push(`<meta property="og:type" content="website">`, `<meta property="og:title" content="${escapeHtml(title)}">`);
  if (description) tags.push(`<meta property="og:description" content="${escapeHtml(description)}">`);
  const shareImage = absolute(page.shareImage);
  if (shareImage) tags.push(`<meta property="og:image" content="${escapeHtml(shareImage)}">`, '<meta name="twitter:card" content="summary_large_image">');
  const canonical = absolute(page.canonical);
  if (canonical) tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`, `<meta property="og:url" content="${escapeHtml(canonical)}">`);
  // translations: every page of a group lists all of them (and the original as x-default); hreflang needs full addresses
  (Array.isArray(page.alternates) ? page.alternates : []).slice(0, 40).forEach(a => {
    const href = absolute(a && a.href);
    if (href && a && (a.lang === 'x-default' || /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(a.lang || ''))) tags.push(`<link rel="alternate" hreflang="${escapeHtml(a.lang)}" href="${escapeHtml(href)}">`);
  });
  if (page.robots === 'noindex') tags.push('<meta name="robots" content="noindex, nofollow">');
  const jsonLd = renderJsonLd(page, title);
  if (jsonLd) tags.push(jsonLd);

  const fav = (page.favicon || '').trim();
  if (fav) {
    const isUrl = /^(https?:|data:|\/|\.\/|[\w-]+\/)/i.test(fav) && !/^\p{Extended_Pictographic}/u.test(fav);
    const href = isUrl
      ? fav
      : 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${escapeHtml(fav)}</text></svg>`);
    if (opts.siteFiles && emojiFavicon(page)) {
      tags.push('<link rel="icon" href="favicon.svg" type="image/svg+xml">', '<link rel="apple-touch-icon" href="apple-touch-icon.png">', '<link rel="manifest" href="site.webmanifest">');
    } else {
      tags.push(`<link rel="icon" href="${escapeHtml(href)}">`);
    }
  } else if (opts.siteFiles) {
    // no favicon chosen: an empty icon keeps browsers from requesting /favicon.ico and logging a 404
    tags.push('<link rel="icon" href="data:,">');
  }

  const families = [];
  const cssFamily = name => `'${String(name).replace(/['"\\<>;{}]/g, '')}'`;
  const cleanName = name => String(name || '').replace(/['"\\<>;{}]/g, '').trim();
  const display = cleanName(page.fontDisplay);
  const body = cleanName(page.fontBody);
  [display, body].filter(Boolean).forEach(n => {
    if (!families.includes(n)) families.push(n);
  });
  if (families.length) {
    const query = families.map(n => `family=${encodeURIComponent(n).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&');
    tags.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
    tags.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    tags.push(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${query}&display=swap">`);
  }

  const css = [];
  if (display) css.push(`:root { --font-display: ${cssFamily(display)}, system-ui, sans-serif; }`);
  if (body) css.push(`:root { --font-body: ${cssFamily(body)}, system-ui, sans-serif; }`);
  const radius = /^\d{1,3}(\.\d{1,2})?(px|rem|em)$/.test(String(page.radius || '').trim()) ? String(page.radius).trim() : '';
  if (radius) css.push(`:root { --radius: ${radius}; }`);
  if (display) css.push(`.page-section :is(h1, h2, h3, h4, h5, h6) { font-family: var(--font-display) !important; }`);
  if (body) css.push(`.page-section :is(p, li, a, span, button, label, input, textarea, blockquote, td, th, figcaption):not(code):not(pre) { font-family: var(--font-body) !important; }`);

  return { title, lang: /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(page.lang || '') ? page.lang : 'en', headTags: tags.join('\n  '), css: css.join('\n') };
}

const api = { renderJsonLd, renderCsp, formDelivery, render404, renderSecurityTxt, SITE_EXTRA_FILES, renderDeployFiles, renderSiteFiles, renderPageHead };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmSiteFiles = api;
})();
