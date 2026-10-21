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

function resolveSafePath(urlPath) {
  const cleanUrl = decodeURIComponent(urlPath.split('?')[0]);
  const rel = cleanUrl === '/' ? '/index.html' : cleanUrl;

  // 1. Try inside VAULT_ROOT (/home/edvins/features-for-web/web-for-options)
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

  // 2. Fallback to PARENT_ROOT (/home/edvins/features-for-web) for ../betteroff, ../vivmgmt, ../carousel-gallery-play
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

  return null;
}

const server = http.createServer((req, res) => {
  const filePath = resolveSafePath(req.url || '/');
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
