#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPO_COMPONENTS = '/tmp/kedhareswer-repo/components';
const FEATURES_DIR = path.join(ROOT, 'features');

if (!fs.existsSync(REPO_COMPONENTS)) {
  console.error("Cloned repository not found at", REPO_COMPONENTS);
  process.exit(1);
}

const componentDirs = fs.readdirSync(REPO_COMPONENTS, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

console.log(`Found ${componentDirs.length} components in repository.`);

function getCategory(slug, title, desc) {
  const text = `${slug} ${title} ${desc}`.toLowerCase();
  if (text.includes('template')) return 'Full Templates';
  if (text.includes('carousel')) return '3D & Carousels';
  if (text.includes('gallery') || text.includes('folio') || text.includes('portfolio') || text.includes('grid')) return 'Galleries & Portfolios';
  if (text.includes('hero') || text.includes('landing') || text.includes('menu') || text.includes('navbar') || text.includes('header') || text.includes('footer')) return 'Navigation & Headers';
  if (text.includes('card') || text.includes('ticket') || text.includes('bento') || text.includes('board')) return 'Cards & Tiles';
  if (text.includes('scroll') || text.includes('parallax') || text.includes('timeline') || text.includes('preloader') || text.includes('reveal')) return 'Scroll & Parallax';
  if (text.includes('shader') || text.includes('mesh') || text.includes('pool') || text.includes('bloom') || text.includes('mist') || text.includes('haze') || text.includes('glitch') || text.includes('starfield')) return 'Audio & Shaders';
  return 'Interactions & Physics';
}

function titleCase(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

let addedCount = 0;
let skippedCount = 0;

for (const slug of componentDirs) {
  const targetDir = path.join(FEATURES_DIR, slug);
  const srcDir = path.join(REPO_COMPONENTS, slug);

  // Read README if exists
  let title = titleCase(slug);
  let description = `Interactive component by Kedhareswer Naidu published on 21st.dev.`;
  const readmePath = path.join(srcDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    const rawReadme = fs.readFileSync(readmePath, 'utf8');
    const titleMatch = rawReadme.match(/^#\s+(.+)$/m);
    if (titleMatch) title = titleMatch[1].trim();

    // First paragraph after title
    const lines = rawReadme.split('\n');
    let para = [];
    let started = false;
    for (const l of lines) {
      if (l.startsWith('#')) {
        started = true;
        continue;
      }
      if (started) {
        if (l.trim() === '' && para.length > 0) break;
        if (l.trim().startsWith('```') || l.trim().startsWith('|')) break;
        if (l.trim() !== '') para.push(l.trim());
      }
    }
    if (para.length > 0) {
      description = para.join(' ');
    }
  }

  const category = getCategory(slug, title, description);

  // Identify main .tsx file
  let mainTsx = null;
  const files = fs.readdirSync(srcDir);
  if (files.includes(`${slug}.tsx`)) {
    mainTsx = `${slug}.tsx`;
  } else {
    const tsxCandidate = files.find(f => f.endsWith('.tsx') && !f.startsWith('demo'));
    if (tsxCandidate) mainTsx = tsxCandidate;
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy component.tsx
  if (mainTsx && fs.existsSync(path.join(srcDir, mainTsx))) {
    fs.copyFileSync(path.join(srcDir, mainTsx), path.join(targetDir, 'component.tsx'));
  }

  // Copy demo files
  const demoFiles = files.filter(f => f.startsWith('demo') && f.endsWith('.tsx'));
  for (const df of demoFiles) {
    fs.copyFileSync(path.join(srcDir, df), path.join(targetDir, df));
  }

  // Write meta.json
  const meta = {
    name: title,
    title: title,
    slug: slug,
    category: category,
    source: '21st.dev',
    type: slug.includes('template') ? 'template' : 'component',
    description: description.slice(0, 300),
    tags: [
      ...new Set([
        ...slug.split('-'),
        '21st.dev',
        category.toLowerCase().split(' ')[0],
        'react'
      ])
    ].slice(0, 8),
    tech: ['React', 'TypeScript', 'Tailwind CSS', 'CSS Physics'],
    dependencies: ['React (.tsx included)', 'Vanilla HTML/CSS/JS'],
    author: 'kedhareswer',
    order: 100 + addedCount
  };
  fs.writeFileSync(path.join(targetDir, 'meta.json'), JSON.stringify(meta, null, 2));

  // Write index.html if not already exists
  if (!fs.existsSync(path.join(targetDir, 'index.html'))) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="feature-stage" id="stageRoot">
    <div class="ambient-glow" aria-hidden="true"></div>
    <div class="feature-header">
      <span class="feature-pill">21st.dev &bull; Kedhareswer</span>
      <h2 class="feature-title">${title}</h2>
      <p class="feature-desc">${description.slice(0, 180)}...</p>
    </div>
    <div class="feature-canvas-wrap">
      <canvas id="interactiveCanvas"></canvas>
    </div>
    <div class="feature-footer">
      <span class="footer-tip">Interactive Preview &bull; Hover, Drag or Click to Experience</span>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`;
    fs.writeFileSync(path.join(targetDir, 'index.html'), html);
  }

  // Write style.css if not already exists
  if (!fs.existsSync(path.join(targetDir, 'style.css'))) {
    const css = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html, body {
  width: 100%;
  height: 100%;
  background: #090a0f;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
  user-select: none;
}
.feature-stage {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(circle at center, #131520 0%, #08090d 100%);
}
.ambient-glow {
  pointer-events: none;
  position: absolute;
  width: 70vw;
  height: 70vh;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  filter: blur(50px);
}
.feature-header {
  position: absolute;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
  max-width: 600px;
  padding: 0 1rem;
}
.feature-pill {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #818cf8;
  padding: 0.3rem 0.8rem;
  border-radius: 9999px;
  display: inline-block;
  margin-bottom: 0.75rem;
}
.feature-title {
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin-bottom: 0.5rem;
  background: linear-gradient(180deg, #fff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.feature-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
  font-weight: 300;
}
.feature-canvas-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.feature-footer {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}
.footer-tip {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #64748b;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.4rem 1rem;
  border-radius: 9999px;
}`;
    fs.writeFileSync(path.join(targetDir, 'style.css'), css);
  }

  // Write script.js if not already exists
  if (!fs.existsSync(path.join(targetDir, 'script.js'))) {
    const js = `/**
 * ${title} Controller
 * Author: Kedhareswer Naidu
 */
(function() {
  const canvas = document.getElementById('interactiveCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let time = 0;
  let mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('pointermove', (e) => {
    mouse.targetX = e.clientX / width;
    mouse.targetY = e.clientY / height;
  });

  function render() {
    time += 0.015;
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    ctx.fillStyle = '#08090d';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.28;

    // Fluid procedural geometric pattern
    const rings = 12;
    for (let r = 0; r < rings; r++) {
      const frac = r / rings;
      const curRadius = radius * (0.3 + frac * 0.8);
      const angleOffset = time * (r % 2 === 0 ? 1 : -1) * 0.4 + frac * Math.PI;

      ctx.beginPath();
      const points = 36;
      for (let p = 0; p <= points; p++) {
        const theta = (p / points) * Math.PI * 2;
        const wave = Math.sin(theta * 4 + angleOffset) * (15 * (1 - frac));
        const px = cx + (curRadius + wave) * Math.cos(theta + angleOffset * 0.2) + (mouse.x - 0.5) * (frac * 60);
        const py = cy + (curRadius + wave) * Math.sin(theta + angleOffset * 0.2) + (mouse.y - 0.5) * (frac * 60);
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const alpha = 0.15 + frac * 0.5;
      ctx.strokeStyle = \`rgba(\${Math.floor(99 + frac * 120)}, \${Math.floor(102 + frac * 60)}, 241, \${alpha.toFixed(2)})\`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();`;
    fs.writeFileSync(path.join(targetDir, 'script.js'), js);
  }

  addedCount++;
}

console.log(`Successfully processed ${addedCount} components from repository into features/.`);
