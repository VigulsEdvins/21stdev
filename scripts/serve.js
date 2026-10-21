const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4173);
const VAULT_ROOT = path.resolve(__dirname, '..');
const PARENT_ROOT = path.resolve(VAULT_ROOT, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.md': 'text/plain; charset=utf-8',
  '.tsx': 'text/plain; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8'
};

function resolveSafePath(urlPath, referer = '') {
  const cleanUrl = decodeURIComponent(urlPath.split('?')[0]);
  const rel = cleanUrl === '/' ? '/index.html' : cleanUrl;

  // 1. Specialized routing for cvmaker and mom full sites
  if (rel.startsWith('/cvmaker')) {
    const sub = rel.replace(/^\/cvmaker\/?/, '');
    const distTarget = path.join(PARENT_ROOT, 'cvmaker', 'dist', sub || 'index.html');
    if (fs.existsSync(distTarget) && fs.statSync(distTarget).isFile()) return distTarget;
    const pubTarget = path.join(PARENT_ROOT, 'cvmaker', 'public', sub);
    if (fs.existsSync(pubTarget) && fs.statSync(pubTarget).isFile()) return pubTarget;
    const directTarget = path.join(PARENT_ROOT, 'cvmaker', sub || 'index.html');
    if (fs.existsSync(directTarget) && fs.statSync(directTarget).isFile()) return directTarget;
  }

  if (rel.startsWith('/mom')) {
    const sub = rel.replace(/^\/mom\/?/, '');
    if (sub === 'admin.html' || sub === 'admin8225.html') {
      const adminTarget = path.join(PARENT_ROOT, 'mom', 'dist', 'admin8225.html');
      if (fs.existsSync(adminTarget)) return adminTarget;
    }
    const distTarget = path.join(PARENT_ROOT, 'mom', 'dist', sub || 'index.html');
    if (fs.existsSync(distTarget) && fs.statSync(distTarget).isFile()) return distTarget;
    const pubTarget = path.join(PARENT_ROOT, 'mom', 'public', sub);
    if (fs.existsSync(pubTarget) && fs.statSync(pubTarget).isFile()) return pubTarget;
    const directTarget = path.join(PARENT_ROOT, 'mom', sub || 'index.html');
    if (fs.existsSync(directTarget) && fs.statSync(directTarget).isFile()) return directTarget;
  }

  // 2. Referer-aware resolution for sub-resources (e.g. /assets/..., /fonts/..., /images/...)
  if (referer) {
    if (referer.includes('/cvmaker')) {
      const inCvDist = path.resolve(PARENT_ROOT, 'cvmaker', 'dist', '.' + rel);
      if (inCvDist.startsWith(path.join(PARENT_ROOT, 'cvmaker')) && fs.existsSync(inCvDist) && fs.statSync(inCvDist).isFile()) {
        return inCvDist;
      }
      const inCvPub = path.resolve(PARENT_ROOT, 'cvmaker', 'public', '.' + rel);
      if (inCvPub.startsWith(path.join(PARENT_ROOT, 'cvmaker')) && fs.existsSync(inCvPub) && fs.statSync(inCvPub).isFile()) {
        return inCvPub;
      }
    } else if (referer.includes('/mom')) {
      const inMomDist = path.resolve(PARENT_ROOT, 'mom', 'dist', '.' + rel);
      if (inMomDist.startsWith(path.join(PARENT_ROOT, 'mom')) && fs.existsSync(inMomDist) && fs.statSync(inMomDist).isFile()) {
        return inMomDist;
      }
      const inMomPub = path.resolve(PARENT_ROOT, 'mom', 'public', '.' + rel);
      if (inMomPub.startsWith(path.join(PARENT_ROOT, 'mom')) && fs.existsSync(inMomPub) && fs.statSync(inMomPub).isFile()) {
        return inMomPub;
      }
    }
  }

  // 3. Try inside VAULT_ROOT (/home/edvins/features-for-web/web-for-options)
  const vaultCandidate = path.resolve(VAULT_ROOT, '.' + rel);
  if (vaultCandidate.startsWith(VAULT_ROOT) && fs.existsSync(vaultCandidate)) {
    const stat = fs.statSync(vaultCandidate);
    if (stat.isDirectory()) {
      const idx = path.join(vaultCandidate, 'index.html');
      if (fs.existsSync(idx)) return idx;
    } else {
      return vaultCandidate;
    }
  }

  // 4. Fallback to PARENT_ROOT (/home/edvins/features-for-web) for ../betteroff, ../vivmgmt, ../carousel-gallery-play, etc.
  const parentCandidate = path.resolve(PARENT_ROOT, '.' + rel);
  if (parentCandidate.startsWith(PARENT_ROOT) && fs.existsSync(parentCandidate)) {
    const stat = fs.statSync(parentCandidate);
    if (stat.isDirectory()) {
      const idx = path.join(parentCandidate, 'index.html');
      if (fs.existsSync(idx)) return idx;
    } else {
      return parentCandidate;
    }
  }

  // 5. Check inside mom/public if requested as /images/... or /fonts/...
  if (rel.startsWith('/images/') || rel.startsWith('/fonts/')) {
    const momPub = path.resolve(PARENT_ROOT, 'mom', 'public', '.' + rel);
    if (fs.existsSync(momPub) && fs.statSync(momPub).isFile()) return momPub;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const filePath = resolveSafePath(req.url || '/', req.headers.referer || '');
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found: ' + req.url);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`21st.local Vault Server running at http://localhost:${PORT}`);
  console.log(`Graphify Interactive Map at http://localhost:${PORT}/graphify-out/graph.html`);
});
