const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const FEATURES_DIR = path.join(ROOT, 'features');

const topItems = [
  {
    slug: 'vapour-text-effect',
    title: 'Vapour Text Effect',
    category: 'Audio & Shaders',
    source: '21st.dev',
    type: 'component',
    description: 'Interactive text vaporization animation using Canvas with customizable text cycling and particle dissolving effects.',
    tags: ['text-effect', 'vapour', 'particles', 'canvas', 'animation', '21st.dev'],
    tech: ['React', 'HTML5 Canvas', 'Tailwind CSS'],
    dependencies: ['React', 'Tailwind CSS'],
    order: 40,
    url: 'https://cdn.21st.dev/jatin-yadav05/vapour-text-effect/default/bundle.1747562393197.html?theme=dark&dark=true'
  },
  {
    slug: 'waitlist-hero',
    title: 'Waitlist Hero Animation',
    category: 'Navigation & UI',
    source: '21st.dev',
    type: 'component',
    description: 'Sleek modern waitlist hero with ambient background particles, glowing input, and smooth interaction states.',
    tags: ['hero', 'waitlist', 'animation', 'particles', '21st.dev'],
    tech: ['React', 'Tailwind CSS', 'Framer Motion'],
    dependencies: ['React', 'Tailwind CSS'],
    order: 41,
    url: 'https://cdn.21st.dev/minhxthanh/waitlist-hero/default/bundle.1764083294693.html?theme=dark&dark=true'
  },
  {
    slug: 'hero-ascii-one',
    title: 'Hero ASCII Wireframe Globe',
    category: '3D & Carousels',
    source: '21st.dev',
    type: 'component',
    description: 'Retro-futuristic terminal ASCII wireframe 3D globe animation with responsive canvas rendering.',
    tags: ['ascii', '3d', 'globe', 'retro', 'terminal', '21st.dev'],
    tech: ['HTML5 Canvas', 'ASCII Art Engine', 'Vanilla JS'],
    dependencies: ['HTML5 Canvas'],
    order: 42,
    url: 'https://cdn.21st.dev/larsen66/hero-ascii-one/default/bundle.1760453288816.html?theme=dark&dark=true'
  },
  {
    slug: 'liquid-metal-hero',
    title: 'Liquid Metal Fluid Hero',
    category: 'Audio & Shaders',
    source: '21st.dev',
    type: 'component',
    description: 'Fluid iridescent liquid metal hero section with real-time shader dynamics and responsive layout.',
    tags: ['shader', 'liquid-metal', 'fluid', 'hero', '21st.dev'],
    tech: ['WebGL', 'GLSL Shaders', 'React'],
    dependencies: ['WebGL', 'GLSL'],
    order: 43,
    url: 'https://cdn.21st.dev/chowlol202/liquid-metal-hero/default/bundle.1755804510221.html?theme=dark&dark=true'
  },
  {
    slug: 'hover-footer',
    title: 'Hover Magnetic Footer',
    category: 'Navigation & UI',
    source: '21st.dev',
    type: 'component',
    description: 'Interactive magnetic hover footer animation with glowing cursor dynamics and social docks.',
    tags: ['footer', 'magnetic', 'cursor', 'interactive', '21st.dev'],
    tech: ['React', 'Framer Motion', 'Tailwind CSS'],
    dependencies: ['React', 'Tailwind CSS'],
    order: 44,
    url: 'https://cdn.21st.dev/mdafsarx/hover-footer/default/bundle.1760085852601.html?theme=dark&dark=true'
  },
  {
    slug: 'gradient-bar-hero-section',
    title: 'Gradient Bar Hero Section',
    category: 'Navigation & UI',
    source: '21st.dev',
    type: 'component',
    description: 'High-contrast gradient bar waitlist hero section with animated illuminated light bars and badge counter.',
    tags: ['hero', 'gradient', 'bars', 'waitlist', '21st.dev'],
    tech: ['React', 'Tailwind CSS', 'CSS Keyframes'],
    dependencies: ['React', 'Tailwind CSS'],
    order: 45,
    url: 'https://cdn.21st.dev/waleedkibhen/gradient-bar-hero-section/default/bundle.1748268568626.html?theme=dark&dark=true'
  },
  {
    slug: 'web-gl-shader',
    title: 'WebGL Chromatic Wave Distortion',
    category: 'Audio & Shaders',
    source: '21st.dev',
    type: 'component',
    description: 'Fullscreen interactive WebGL fluid chromatic wave distortion shader with mouse movement tracking.',
    tags: ['webgl', 'shader', 'chromatic', 'distortion', 'waves', '21st.dev'],
    tech: ['WebGL', 'Fragment Shader', 'GLSL'],
    dependencies: ['WebGL'],
    order: 46,
    url: 'https://cdn.21st.dev/designali-in/web-gl-shader/default/bundle.1755766452368.html?theme=dark&dark=true'
  },
  {
    slug: 'hover-preview',
    title: 'Cursor Hover Link Preview',
    category: 'Cursors & Physics',
    source: '21st.dev',
    type: 'component',
    description: 'Smooth cursor-following floating image card preview component that displays previews above text links.',
    tags: ['cursor', 'hover', 'preview', 'floating', '21st.dev'],
    tech: ['React', 'Tailwind CSS', 'Framer Motion'],
    dependencies: ['React', 'Tailwind CSS'],
    order: 47,
    url: 'https://cdn.21st.dev/minhxthanh/hover-preview/default/bundle.1764082704077.html?theme=dark&dark=true'
  },
  {
    slug: 'glass-fold',
    title: 'Glass Fold Translucent Mesh',
    category: 'Audio & Shaders',
    source: '21st.dev',
    type: 'component',
    description: 'Animated WebGL background of translucent glass panes folded over each other with lit creases.',
    tags: ['webgl', 'glass', 'glassmorphism', 'background', '21st.dev'],
    tech: ['WebGL', 'GLSL Shader', 'Canvas'],
    dependencies: ['WebGL'],
    order: 48,
    url: 'https://cdn.21st.dev/meerbahadin10/glass-fold/default/bundle.1791809519614-fdd5fcdc-01e5-4ed2-b66a-94f6a79c21f1.html?theme=dark&dark=true'
  }
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  console.log(`Starting import of ${topItems.length} top 21st.dev components...`);

  for (const item of topItems) {
    const dir = path.join(FEATURES_DIR, item.slug);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`Downloading bundle for ${item.slug}...`);
    let bundleHtml = await fetchUrl(item.url);

    // Ensure style.css and script.js tags exist in the HTML so standard loaders work
    if (!/<link\b[^>]*href=["'](?:\.\/)?style\.css["']/i.test(bundleHtml)) {
      if (/<\/head>/i.test(bundleHtml)) {
        bundleHtml = bundleHtml.replace(/<\/head>/i, '  <link rel="stylesheet" href="style.css" />\n</head>');
      } else {
        bundleHtml = '<link rel="stylesheet" href="style.css" />\n' + bundleHtml;
      }
    }

    if (!/<script\b[^>]*src=["'](?:\.\/)?script\.js["']/i.test(bundleHtml)) {
      if (/<\/body>/i.test(bundleHtml)) {
        bundleHtml = bundleHtml.replace(/<\/body>/i, '  <script src="script.js"></script>\n</body>');
      } else {
        bundleHtml = bundleHtml + '\n<script src="script.js"></script>';
      }
    }

    // Write index.html
    fs.writeFileSync(path.join(dir, 'index.html'), bundleHtml, 'utf8');

    // Write style.css
    const cssContent = `/* Scoped styles for ${item.title} */
html, body {
  margin: 0;
  padding: 0;
  background-color: #050508;
  color: #f3f4f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow-x: hidden;
  min-height: 100vh;
}
`;
    fs.writeFileSync(path.join(dir, 'style.css'), cssContent, 'utf8');

    // Write script.js
    const jsContent = `// Runtime controller for ${item.title}
console.log('21st.dev feature [${item.slug}] mounted');
`;
    fs.writeFileSync(path.join(dir, 'script.js'), jsContent, 'utf8');

    // Write meta.json
    const meta = {
      name: item.title,
      title: item.title,
      slug: item.slug,
      category: item.category,
      source: item.source,
      type: item.type,
      description: item.description,
      tags: item.tags,
      tech: item.tech,
      dependencies: item.dependencies,
      order: item.order
    };
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

    console.log(`Saved features/${item.slug} successfully.`);
  }

  console.log('All 9 components imported. Syncing registry...');
  const { syncRegistry } = require('./sync-registry');
  const result = syncRegistry(ROOT);
  console.log(`Registry sync completed: ${result.count} total features.`);
}

run().catch(err => {
  console.error('Error during import:', err);
  process.exit(1);
});
