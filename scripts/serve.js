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
  let cleanUrl;
  try {
    cleanUrl = decodeURIComponent((urlPath || '/').split('?')[0]);
  } catch {
    return null;
  }
  const rel = cleanUrl === '/' ? '/index.html' : cleanUrl;

  // Helper to ensure target path is strictly within an allowed root
  const isInside = (child, parent) => {
    const relCheck = path.relative(parent, child);
    return relCheck && !relCheck.startsWith('..') && !path.isAbsolute(relCheck);
  };

  // 1. Specialized routing for cvmaker and mom full sites
  if (rel.startsWith('/cvmaker')) {
    const sub = rel.replace(/^\/cvmaker\/?/, '');
    const distTarget = path.resolve(PARENT_ROOT, 'cvmaker', 'dist', sub || 'index.html');
    if (isInside(distTarget, PARENT_ROOT) && fs.existsSync(distTarget) && fs.statSync(distTarget).isFile()) return distTarget;
    const pubTarget = path.resolve(PARENT_ROOT, 'cvmaker', 'public', sub);
    if (isInside(pubTarget, PARENT_ROOT) && fs.existsSync(pubTarget) && fs.statSync(pubTarget).isFile()) return pubTarget;
    const directTarget = path.resolve(PARENT_ROOT, 'cvmaker', sub || 'index.html');
    if (isInside(directTarget, PARENT_ROOT) && fs.existsSync(directTarget) && fs.statSync(directTarget).isFile()) return directTarget;
  }

  if (rel.startsWith('/mom')) {
    const sub = rel.replace(/^\/mom\/?/, '');
    if (sub === 'admin.html' || sub === 'admin8225.html') {
      const adminTarget = path.resolve(PARENT_ROOT, 'mom', 'dist', 'admin8225.html');
      if (isInside(adminTarget, PARENT_ROOT) && fs.existsSync(adminTarget)) return adminTarget;
    }
    const distTarget = path.resolve(PARENT_ROOT, 'mom', 'dist', sub || 'index.html');
    if (isInside(distTarget, PARENT_ROOT) && fs.existsSync(distTarget) && fs.statSync(distTarget).isFile()) return distTarget;
    const pubTarget = path.resolve(PARENT_ROOT, 'mom', 'public', sub);
    if (isInside(pubTarget, PARENT_ROOT) && fs.existsSync(pubTarget) && fs.statSync(pubTarget).isFile()) return pubTarget;
    const directTarget = path.resolve(PARENT_ROOT, 'mom', sub || 'index.html');
    if (isInside(directTarget, PARENT_ROOT) && fs.existsSync(directTarget) && fs.statSync(directTarget).isFile()) return directTarget;
  }

  // 2. Referer-aware resolution for sub-resources (e.g. /assets/..., /fonts/..., /images/...)
  if (referer) {
    if (referer.includes('/cvmaker')) {
      const inCvDist = path.resolve(PARENT_ROOT, 'cvmaker', 'dist', '.' + rel);
      if (isInside(inCvDist, path.join(PARENT_ROOT, 'cvmaker')) && fs.existsSync(inCvDist) && fs.statSync(inCvDist).isFile()) {
        return inCvDist;
      }
      const inCvPub = path.resolve(PARENT_ROOT, 'cvmaker', 'public', '.' + rel);
      if (isInside(inCvPub, path.join(PARENT_ROOT, 'cvmaker')) && fs.existsSync(inCvPub) && fs.statSync(inCvPub).isFile()) {
        return inCvPub;
      }
    } else if (referer.includes('/mom')) {
      const inMomDist = path.resolve(PARENT_ROOT, 'mom', 'dist', '.' + rel);
      if (isInside(inMomDist, path.join(PARENT_ROOT, 'mom')) && fs.existsSync(inMomDist) && fs.statSync(inMomDist).isFile()) {
        return inMomDist;
      }
      const inMomPub = path.resolve(PARENT_ROOT, 'mom', 'public', '.' + rel);
      if (isInside(inMomPub, path.join(PARENT_ROOT, 'mom')) && fs.existsSync(inMomPub) && fs.statSync(inMomPub).isFile()) {
        return inMomPub;
      }
    }
  }

  // 3. Try inside VAULT_ROOT (/home/edvins/features-for-web/web-for-options)
  const vaultCandidate = path.resolve(VAULT_ROOT, '.' + rel);
  if ((vaultCandidate === VAULT_ROOT || isInside(vaultCandidate, VAULT_ROOT)) && fs.existsSync(vaultCandidate)) {
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
  if ((parentCandidate === PARENT_ROOT || isInside(parentCandidate, PARENT_ROOT)) && fs.existsSync(parentCandidate)) {
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
    if (isInside(momPub, PARENT_ROOT) && fs.existsSync(momPub) && fs.statSync(momPub).isFile()) return momPub;
  }

  return null;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('405 Method Not Allowed');
    return;
  }

  const filePath = resolveSafePath(req.url || '/', req.headers.referer || '');
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found: ' + (req.url || '/'));
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff'
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('500 Internal Server Error');
  });
  stream.pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`21st.local Vault Server running at http://localhost:${PORT}`);
  console.log(`Graphify Interactive Map at http://localhost:${PORT}/graphify-out/graph.html`);
});
