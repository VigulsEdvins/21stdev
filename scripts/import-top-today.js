const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const FEATURES_DIR = path.join(ROOT, 'features');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function setupFileCardCollections() {
  const slug = 'file-card-collections';
  const dir = path.join(FEATURES_DIR, slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log('Setting up ' + slug + '...');
  const bundleUrl = 'https://cdn.21st.dev/urmauur/file-card-collections/default/bundle.1776005744862.html?theme=dark&dark=true';
  let html = await fetchUrl(bundleUrl);

  if (!/<link\b[^>]*href=["'](?:\.\/)?style\.css["']/i.test(html)) {
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, '  <link rel="stylesheet" href="style.css" />\n</head>');
    } else {
      html = '<link rel="stylesheet" href="style.css" />\n' + html;
    }
  }

  if (!/<script\b[^>]*src=["'](?:\.\/)?script\.js["']/i.test(html)) {
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, '  <script src="script.js"></script>\n</body>');
    } else {
      html = html + '\n<script src="script.js"></script>';
    }
  }

  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');

  const css = `/* Scoped styles for File Card Collections */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: #09090b;
  color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
}

#root {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
`;
  fs.writeFileSync(path.join(dir, 'style.css'), css, 'utf8');

  const js = `// File Card Collections by @urmauur
console.log('File Card Collections initialized');
`;
  fs.writeFileSync(path.join(dir, 'script.js'), js, 'utf8');

  const meta = {
    name: "File Card Collections",
    title: "File Card Collections",
    slug,
    category: "Cards & Tiles",
    source: "21st.dev",
    type: "component",
    description: "Interactive frosted glass folder and card collection stacks with vibrant abstract liquid art tabs, active tab states, and smooth spring physics.",
    tags: [
      "cards",
      "folders",
      "glassmorphism",
      "file-card",
      "21st.dev",
      "top-today"
    ],
    tech: [
      "React",
      "Tailwind CSS",
      "Framer Motion"
    ],
    dependencies: [
      "React",
      "Tailwind CSS"
    ],
    order: 1
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  console.log('✓ ' + slug + ' created.');
}

async function setupTiltedGridHero() {
  const slug = 'tilted-grid-hero';
  const dir = path.join(FEATURES_DIR, slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log('Setting up ' + slug + '...');
  const bundleUrl = 'https://cdn.21st.dev/ruixen.ui/tilted-grid-hero/default/bundle.1791472722202-4d56f93d-d0f7-4b76-8ec0-bee12b8136b5.html?theme=dark&dark=true';
  let html = await fetchUrl(bundleUrl);

  if (!/<link\b[^>]*href=["'](?:\.\/)?style\.css["']/i.test(html)) {
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, '  <link rel="stylesheet" href="style.css" />\n</head>');
    } else {
      html = '<link rel="stylesheet" href="style.css" />\n' + html;
    }
  }

  if (!/<script\b[^>]*src=["'](?:\.\/)?script\.js["']/i.test(html)) {
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, '  <script src="script.js"></script>\n</body>');
    } else {
      html = html + '\n<script src="script.js"></script>';
    }
  }

  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');

  const css = `/* Scoped styles for Tilted Grid Hero */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: #050505;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
}

#root {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
`;
  fs.writeFileSync(path.join(dir, 'style.css'), css, 'utf8');

  const js = `// Tilted Grid Hero by @ruixen.ui
console.log('Tilted Grid Hero initialized');
`;
  fs.writeFileSync(path.join(dir, 'script.js'), js, 'utf8');

  const meta = {
    name: "Tilted Grid Hero",
    title: "Tilted Grid Hero",
    slug,
    category: "3D & Carousels",
    source: "21st.dev",
    type: "component",
    description: "Every frame, brought into focus. Images curve in from one edge, flatten out at the centre, then fade away round the other with 3D perspective distortion.",
    tags: [
      "hero",
      "3d",
      "curved",
      "perspective",
      "carousel",
      "21st.dev",
      "top-today"
    ],
    tech: [
      "React",
      "Three.js / CSS 3D",
      "Tailwind CSS"
    ],
    dependencies: [
      "React",
      "Tailwind CSS"
    ],
    order: 3
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  console.log('✓ ' + slug + ' created.');
}

async function setupFormaLiquidParticleStudio() {
  const slug = 'forma-liquid-particle-studio';
  const dir = path.join(FEATURES_DIR, slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log('Setting up ' + slug + '...');
  const cssUrl = 'https://forma-liquid-particle-studio-template-v1.21st.app/assets/index-JgX2oGj2.css';
  const jsUrl = 'https://forma-liquid-particle-studio-template-v1.21st.app/assets/index-Dq4YOvcp.js';

  let rawCss = await fetchUrl(cssUrl);
  let rawJs = await fetchUrl(jsUrl);

  // In CSS, prefix font URLs with full origin so they load cleanly
  rawCss = rawCss.replace(/url\(\/assets\//g, 'url(https://forma-liquid-particle-studio-template-v1.21st.app/assets/');

  const html = `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Forma — Liquid Particle Studio</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div id="root"></div>
    <script src="script.js"></script>
  </body>
</html>`;

  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(dir, 'style.css'), rawCss, 'utf8');
  fs.writeFileSync(path.join(dir, 'script.js'), rawJs, 'utf8');

  const meta = {
    name: "Forma - Liquid Particle Studio",
    title: "Forma - Liquid Particle Studio",
    slug,
    category: "Full Websites",
    source: "21st.dev",
    type: "template",
    description: "Form that answers back. High-end independent studio template featuring real-time WebGL liquid particle simulations, responsive layout, and smooth typography.",
    tags: [
      "template",
      "particles",
      "liquid",
      "threejs",
      "studio",
      "webgl",
      "21st.dev",
      "top-today"
    ],
    tech: [
      "React",
      "Three.js",
      "WebGL",
      "Vite"
    ],
    dependencies: [
      "React",
      "Three.js",
      "WebGL"
    ],
    order: 4
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  console.log('✓ ' + slug + ' created.');
}

async function setupIntoTheEther() {
  const slug = 'into-the-ether';
  const dir = path.join(FEATURES_DIR, slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log('Setting up ' + slug + '...');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Into The Ether — Ambient Pulse Hero</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css" />
</head>
<body class="theme-light">
  <div class="ether-viewport">
    <canvas id="etherCanvas" class="ether-canvas"></canvas>

    <div class="ether-card">
      <div class="ether-card-inner">
        <div class="ether-badge">
          <span class="badge-dot"></span>
          <span>SPATIAL RESONANCE 2.0</span>
        </div>

        <div class="ether-title-wrap">
          <h1 class="ether-title">
            <span class="word">INTO THE</span>
            <span class="word ether-glow-text">ETHER</span>
          </h1>
        </div>

        <p class="ether-subtitle">
          Enter a new realm of ambient sound and kinetic light waves.<br>
          Where digital interface becomes visceral sensation.
        </p>

        <div class="ether-actions">
          <button class="ether-btn primary" id="btnPulse">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Trigger Pulse</span>
          </button>
          <button class="ether-btn secondary" id="btnTheme">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
            </svg>
            <span id="themeLabel">Dark Theme</span>
          </button>
        </div>

        <div class="ether-stats">
          <div class="stat-col">
            <span class="stat-num" id="statRipples">14</span>
            <span class="stat-lbl">Wave Harmonic</span>
          </div>
          <div class="stat-div"></div>
          <div class="stat-col">
            <span class="stat-num" id="statFps">60 FPS</span>
            <span class="stat-lbl">Fluid Canvas</span>
          </div>
          <div class="stat-div"></div>
          <div class="stat-col">
            <span class="stat-num">0.04 ms</span>
            <span class="stat-lbl">Audio Latency</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>`;

  const css = `/* Into The Ether - Scoped Styles */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-family: 'Space Grotesk', -apple-system, sans-serif;
  overflow: hidden;
  user-select: none;
  -webkit-font-smoothing: antialiased;
}

body.theme-light {
  --bg-core: #f5f5f9;
  --bg-card: rgba(255, 255, 255, 0.94);
  --bg-card-border: rgba(99, 102, 241, 0.18);
  --text-main: #0f172a;
  --text-muted: #64748b;
  --ring-color: rgba(99, 102, 241, 0.16);
  --ring-active: rgba(79, 70, 229, 0.65);
  --center-glow: rgba(99, 102, 241, 0.22);
  --btn-primary-bg: #4f46e5;
  --btn-primary-text: #ffffff;
  --btn-sec-bg: rgba(0, 0, 0, 0.05);
  --btn-sec-border: rgba(0, 0, 0, 0.12);
  --btn-sec-text: #1e293b;
  --dot-grid: rgba(99, 102, 241, 0.14);
}

body.theme-dark {
  --bg-core: #09090e;
  --bg-card: rgba(15, 15, 23, 0.92);
  --bg-card-border: rgba(129, 140, 248, 0.22);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --ring-color: rgba(129, 140, 248, 0.14);
  --ring-active: rgba(165, 180, 252, 0.7);
  --center-glow: rgba(99, 102, 241, 0.35);
  --btn-primary-bg: #6366f1;
  --btn-primary-text: #ffffff;
  --btn-sec-bg: rgba(255, 255, 255, 0.06);
  --btn-sec-border: rgba(255, 255, 255, 0.14);
  --btn-sec-text: #f1f5f9;
  --dot-grid: rgba(255, 255, 255, 0.08);
}

.ether-viewport {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-core);
  transition: background-color 0.4s ease;
  overflow: hidden;
}

.ether-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: all;
  cursor: crosshair;
}

.ether-card {
  position: relative;
  z-index: 2;
  max-width: 580px;
  width: 90%;
  padding: 44px 36px 36px;
  border-radius: 24px;
  background: var(--bg-card);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid var(--bg-card-border);
  box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.18),
              0 0 100px -20px var(--center-glow);
  text-align: center;
  transform: translateZ(0);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
}

.ether-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #4f46e5;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.25);
  margin-bottom: 22px;
}

body.theme-dark .ether-badge {
  color: #a5b4fc;
  background: rgba(129, 140, 248, 0.12);
  border-color: rgba(129, 140, 248, 0.3);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 10px currentColor;
  animation: pulse-dot 1.8s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.3); }
}

.ether-title {
  margin: 0 0 16px 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(34px, 5.5vw, 56px);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: var(--text-main);
  text-transform: uppercase;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ether-glow-text {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 4px 18px rgba(99, 102, 241, 0.3));
}

body.theme-dark .ether-glow-text {
  background: linear-gradient(135deg, #a5b4fc 0%, #c084fc 50%, #93c5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 24px rgba(165, 180, 252, 0.4));
}

.ether-subtitle {
  margin: 0 auto 28px;
  max-width: 440px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
  font-weight: 400;
}

.ether-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 28px;
}

.ether-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid transparent;
}

.ether-btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
}

.ether-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
}

.ether-btn.primary:active {
  transform: translateY(0);
}

.ether-btn.secondary {
  background: var(--btn-sec-bg);
  color: var(--btn-sec-text);
  border-color: var(--btn-sec-border);
}

.ether-btn.secondary:hover {
  background: rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

body.theme-dark .ether-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.ether-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-top: 20px;
  border-top: 1px solid var(--bg-card-border);
}

.stat-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stat-num {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.stat-lbl {
  font-size: 10.5px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.stat-div {
  width: 1px;
  height: 24px;
  background: var(--bg-card-border);
}
`;

  const js = `// Into The Ether - Kinetic Concentric Wave Harmonic System
(() => {
  const canvas = document.getElementById('etherCanvas');
  const ctx = canvas.getContext('2d');
  const btnPulse = document.getElementById('btnPulse');
  const btnTheme = document.getElementById('btnTheme');
  const themeLabel = document.getElementById('themeLabel');
  const statFps = document.getElementById('statFps');
  const statRipples = document.getElementById('statRipples');

  let width = 0;
  let height = 0;
  let dpr = 1;

  // Ripples & Wave state
  const ringsCount = 14;
  let basePhase = 0;
  const ripples = [];
  const dots = [];

  // Mouse & Interaction
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, isHovering: false };

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    mouse.x = width / 2;
    mouse.y = height / 2;
    mouse.targetX = width / 2;
    mouse.targetY = height / 2;

    initDots();
  }

  function initDots() {
    dots.length = 0;
    const spacing = 32;
    const cols = Math.ceil(width / spacing);
    const rows = Math.ceil(height / spacing);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        dots.push({
          x: i * spacing,
          y: j * spacing,
          baseRadius: 1.2,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  function createRipple(x, y, maxRadius, speed) {
    ripples.push({
      x: x || width / 2,
      y: y || height / 2,
      radius: 10,
      maxRadius: maxRadius || 380,
      speed: speed || 3.5,
      opacity: 0.85
    });
    if (statRipples) {
      statRipples.textContent = String(ringsCount + ripples.length);
    }
  }

  // Audio Synth Pulse using Web Audio API
  let audioCtx = null;
  function playEtherTone() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // Audio autoplay policy graceful fallback
    }
  }

  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.targetX = e.clientX - rect.left;
    mouse.targetY = e.clientY - rect.top;
    mouse.isHovering = true;
  });

  window.addEventListener('pointerleave', () => {
    mouse.targetX = width / 2;
    mouse.targetY = height / 2;
    mouse.isHovering = false;
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    createRipple(x, y, Math.max(width, height) * 0.9, 5);
    playEtherTone();
  });

  if (btnPulse) {
    btnPulse.addEventListener('click', () => {
      createRipple(width / 2, height / 2, Math.max(width, height) * 1.1, 6);
      playEtherTone();
    });
  }

  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('theme-dark');
      document.body.classList.toggle('theme-light', !isDark);
      themeLabel.textContent = isDark ? 'Light Theme' : 'Dark Theme';
    });
  }

  // Animation Loop with FPS counter
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;

  function render(time) {
    requestAnimationFrame(render);

    const delta = (time - lastTime) / 1000;
    lastTime = time;

    frameCount++;
    fpsTimer += delta;
    if (fpsTimer >= 0.5) {
      const currentFps = Math.round(frameCount / fpsTimer);
      if (statFps) statFps.textContent = currentFps + ' FPS';
      frameCount = 0;
      fpsTimer = 0;
    }

    basePhase += 0.02;

    // Smooth cursor interpolation
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    ctx.clearRect(0, 0, width, height);

    const isDark = document.body.classList.contains('theme-dark');
    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Draw Subtle Background Dot Grid
    const dotColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(99, 102, 241, 0.08)';
    ctx.fillStyle = dotColor;
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const dist = Math.hypot(dot.x - mouse.x, dot.y - mouse.y);
      let r = dot.baseRadius;
      if (dist < 180) {
        r += (1 - dist / 180) * 1.4;
      }
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Core Ambient Gradient
    const coreGrad = ctx.createRadialGradient(
      centerX + (mouse.x - centerX) * 0.15,
      centerY + (mouse.y - centerY) * 0.15,
      20,
      centerX,
      centerY,
      Math.min(width, height) * 0.55
    );
    if (isDark) {
      coreGrad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
      coreGrad.addColorStop(0.4, 'rgba(129, 140, 248, 0.12)');
      coreGrad.addColorStop(1, 'rgba(9, 9, 14, 0)');
    } else {
      coreGrad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
      coreGrad.addColorStop(0.4, 'rgba(147, 197, 253, 0.15)');
      coreGrad.addColorStop(1, 'rgba(245, 245, 249, 0)');
    }
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.min(width, height) * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Kinetic Harmonic Concentric Rings
    const maxRadius = Math.min(width, height) * 0.52;
    for (let i = 1; i <= ringsCount; i++) {
      const ringRatio = i / ringsCount;
      const breathing = Math.sin(basePhase + i * 0.45) * 8;
      const baseR = ringRatio * maxRadius + breathing;

      // Parallax offset towards mouse
      const offsetX = (mouse.x - centerX) * 0.06 * ringRatio;
      const offsetY = (mouse.y - centerY) * 0.06 * ringRatio;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX + offsetX, centerY + offsetY, Math.max(0, baseR), 0, Math.PI * 2);

      const ringAlpha = (1 - ringRatio * 0.7) * (isDark ? 0.35 : 0.28);
      ctx.strokeStyle = isDark
        ? 'rgba(165, 180, 252, ' + ringAlpha + ')'
        : 'rgba(99, 102, 241, ' + ringAlpha + ')';
      ctx.lineWidth = i % 3 === 0 ? 1.8 : 1.0;
      if (i % 2 === 0) {
        ctx.setLineDash([4, 6]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Update and Draw Expanding Interactive Ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += r.speed;
      r.opacity -= 0.012;

      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = isDark
        ? 'rgba(199, 210, 254, ' + r.opacity + ')'
        : 'rgba(79, 70, 229, ' + r.opacity + ')';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = isDark ? '#818cf8' : '#4f46e5';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
    }
  }

  requestAnimationFrame(render);
})();
`;

  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(dir, 'style.css'), css, 'utf8');
  fs.writeFileSync(path.join(dir, 'script.js'), js, 'utf8');

  const meta = {
    name: "Into The Ether",
    title: "Into The Ether",
    slug,
    category: "Audio & Shaders",
    source: "21st.dev",
    type: "component",
    description: "Atmospheric typographic hero section with hypnotic concentric ether ripple rings, kinetic mouse harmonics, Web Audio synthesizer pulse, and luminous dual theme.",
    tags: [
      "typography",
      "ether",
      "ripple",
      "pulse",
      "canvas",
      "hero",
      "ambient",
      "21st.dev",
      "top-today"
    ],
    tech: [
      "HTML5 Canvas",
      "Web Audio API",
      "Vanilla JS",
      "CSS Keyframes"
    ],
    dependencies: [
      "HTML5 Canvas",
      "Web Audio API"
    ],
    order: 2
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  console.log('✓ ' + slug + ' created.');
}

async function main() {
  console.log('=== Importing 4 Top Today Carousel Components ===');
  await setupFileCardCollections();
  await setupIntoTheEther();
  await setupTiltedGridHero();
  await setupFormaLiquidParticleStudio();
  console.log('=== All 4 Components successfully created! ===');
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
