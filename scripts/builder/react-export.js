/**
 * React project export: turns the sections of a page into a small Vite + React + TypeScript project.
 * Only features that ship a React source (component.tsx plus demo.tsx) can be included; the rest are listed in
 * the result so the caller can tell the person. Pure (no DOM, no network): the caller supplies the sources and
 * fetches the assets it reports.
 *   ReactExport.generateReactProject({ stack, theme, page, sources })
 *   sources: { [slug]: { title, component, demo, css } }
 * Returns { files, assetUrls, included, skipped, dependencies }.
 */
(function () {
  'use strict';

  const KNOWN_VERSIONS = { gsap: '^3.15.0', 'd3-geo': '^3.1.1', react: '^19.3.1', 'react-dom': '^19.3.1' };
  const PROVIDED = new Set(['react', 'react-dom', 'react/jsx-runtime']);

  const Assembler = () => (typeof window !== 'undefined' && window.Assembler) || require('../assembler.js');

  const importsOf = (src) => {
    const out = [];
    const re = /(?:^|\n)\s*(?:import|export)\s[^'"\n]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) out.push(m[1] || m[2]);
    return out;
  };

  /** Package name of an import path: "gsap/dist/SplitText" -> "gsap", "@gsap/react" -> "@gsap/react" */
  const packageOf = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);

  /** Why a feature cannot be part of the React project, or null if it can. */
  function unsupportedReason(slug, src) {
    if (!src || !src.component || !src.demo) return 'it has no React source (it is plain HTML/CSS/JS)';
    const own = `@/components/ui/${slug}`;
    for (const spec of [...importsOf(src.component), ...importsOf(src.demo)]) {
      if (spec.startsWith('next/')) return 'it uses Next.js APIs';
      if (spec.startsWith('@/')) {
        if (spec === own || spec === '@/lib/utils') continue;
        return `it imports ${spec}, which this export does not include`;
      }
      if (spec.startsWith('.')) return 'it imports files next to it that this export does not include';
    }
    return null;
  }

  const cnSource = `export function cn(...inputs: unknown[]): string {
  return inputs
    .flat(Infinity as 1)
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .join(' ')
}
`;

  function themeCss(theme) {
    const t = Assembler().resolveTheme(theme);
    return `:root {
  --bg: ${t.bg};
  --text: ${t.text};
  --accent: ${t.accent};
  --card-bg: ${t.cardBg};
  --border: ${t.border};
  /* names the sections use */
  --background: ${t.bg};
  --foreground: ${t.text};
  --primary: ${t.accent};
  --card: ${t.cardBg};
  --muted-foreground: color-mix(in srgb, ${t.text} 60%, transparent);
}
html, body, #root { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); }
body { font-family: var(--font-body, system-ui, sans-serif); }
`;
  }

  function generateReactProject({ stack = [], theme = 'midnight-dark', page = {}, sources = {} }) {
    const A = Assembler();
    const files = {};
    const included = [];
    const skipped = [];
    const deps = {};
    const assetUrls = new Set();
    const seen = new Set();
    const order = [];

    stack.forEach((s) => {
      const slug = s.slug;
      if (!slug) return;
      order.push(slug);
      if (seen.has(slug)) return;
      seen.add(slug);
      const src = sources[slug];
      const reason = unsupportedReason(slug, src);
      if (reason) { skipped.push({ slug, title: (src && src.title) || slug, reason }); return; }
      included.push(slug);
      files[`src/components/ui/${slug}.tsx`] = src.component;
      files[`src/sections/${slug}.tsx`] = src.demo;
      files[`src/styles/${slug}.css`] = src.css || '';
      [src.component, src.demo, src.css || ''].forEach(text => A.findLocalAssetUrls(text).forEach(u => assetUrls.add(u)));
      [...importsOf(src.component), ...importsOf(src.demo)].forEach(spec => {
        if (spec.startsWith('@/') || spec.startsWith('.') || PROVIDED.has(spec)) return;
        const pkg = packageOf(spec);
        if (!PROVIDED.has(pkg)) deps[pkg] = KNOWN_VERSIONS[pkg] || 'latest';
      });
    });

    const placed = order.filter(slug => included.includes(slug));
    const names = [...new Set(placed)].map((slug, i) => ({ slug, name: 'Section' + (i + 1) }));
    const nameOf = Object.fromEntries(names.map(n => [n.slug, n.name]));

    files['src/App.tsx'] = `${names.map(n => `import ${n.name} from "./sections/${n.slug}"\nimport "./styles/${n.slug}.css"`).join('\n')}

export default function App() {
  return (
    <main>
${placed.map(slug => `      <${nameOf[slug]} />`).join('\n') || '      {/* no sections */}'}
    </main>
  )
}
`;
    files['src/main.tsx'] = `import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
`;
    files['src/index.css'] = themeCss(theme);
    files['src/lib/utils.ts'] = cnSource;

    const head = A.renderPageHead(page || {}, 'My site');
    files['index.html'] = `<!doctype html>
<html lang="${head.lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${head.headTags}
    ${head.css ? `<style>\n${head.css}\n    </style>` : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
    const slugName = String(head.title || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site';
    files['package.json'] = JSON.stringify({
      name: slugName,
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'tsc --noEmit false --skipLibCheck && vite build', preview: 'vite preview' },
      dependencies: { react: KNOWN_VERSIONS.react, 'react-dom': KNOWN_VERSIONS['react-dom'], ...deps },
      devDependencies: { '@types/react': '^19.3.0', '@types/react-dom': '^19.3.0', '@vitejs/plugin-react': '^4.3.0', typescript: '^5.6.0', vite: '^5.4.0' }
    }, null, 2) + '\n';
    files['vite.config.ts'] = `import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
})
`;
    files['tsconfig.json'] = JSON.stringify({
      compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: false, skipLibCheck: true, noEmit: true, baseUrl: '.', paths: { '@/*': ['src/*'] } },
      include: ['src']
    }, null, 2) + '\n';
    files['README.md'] = `# ${head.title}

A Vite + React + TypeScript project assembled from your page. Each section is a component in \`src/components/ui/\`, shown by a small demo wrapper in \`src/sections/\` (edit that file to change the text and options), with its styles in \`src/styles/\`.

\`\`\`bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
\`\`\`

Images, video and fonts are in \`public/\` and keep their \`/assets/...\` paths.

## What is not carried over

- Edits made in the builder's Content tab. Change the text in the section files instead.
- Section sizing and the builder's own theme engine; the page colours are plain CSS variables in \`src/index.css\`.
- Each section's CSS is global, so two sections that style the same class name can interfere.
${skipped.length ? `
## Sections left out

These sections have no React source or need files this export does not include:

${skipped.map(s => `- ${s.title} (\`${s.slug}\`): ${s.reason}`).join('\n')}
` : ''}${Object.keys(deps).length ? `
## Extra packages

Packages used by the sections are listed in \`package.json\`; those marked \`latest\` have no pinned version, so pin them once the site works.
` : ''}`;

    return { files, assetUrls: Array.from(assetUrls), included, skipped, dependencies: deps };
  }

  const api = { generateReactProject, unsupportedReason, importsOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ReactExport = api;
})();
