/**
 * React project export: turns the sections of a page into a small Vite + React + TypeScript project.
 * A feature with a React source (component.tsx plus demo.tsx) becomes a real component. Every other feature is
 * plain HTML/CSS/JS and is wrapped: its markup is rendered as it is, its CSS is scoped to the section and its script
 * runs once after the section mounts. Features that cannot be wrapped (module scripts, Next.js imports) are listed in
 * the result so the caller can tell the person. Pure (no DOM, no network): the caller supplies the sources and
 * fetches the assets it reports.
 *   ReactExport.generateReactProject({ stack, theme, page, sources })
 *   sources: { [slug]: { title, component, demo, css } | { title, index, js, css, ownPalette } }
 *   ownPalette: the feature keeps its own colours (meta.json), so its CSS is scoped without the theme normaliser
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
    if (!src) return 'its files could not be read';
    if (!src.component || !src.demo) {
      if (!src.index) return 'its files could not be read';
      if (/<script\b[^>]*\btype\s*=\s*["']module["']/i.test(src.index)) return 'it uses ES module scripts, which cannot be wrapped as plain HTML';
      return null;
    }
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


  const isReactSource = (src) => !!(src && src.component && src.demo);
  const isRemote = (u) => /^(https?:)?\/\//i.test(u);

  /**
   * Splits a plain feature into what the wrapper needs: markup without scripts, scoped CSS, one script (the feature's
   * own script.js and any inline scripts, in page order) and the remote scripts / stylesheets its page loaded.
   */
  function splitPlainFeature(slug, src) {
    const A = Assembler();
    const id = 'sec-' + slug;
    const html = String(src.index || '');
    const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || ['', ''])[1];
    const remoteLinks = [];
    (head.match(/<link\b[^>]*>/gi) || []).forEach(tag => {
      const href = (/\bhref\s*=\s*["']([^"']+)["']/i.exec(tag) || [])[1];
      if (/\brel\s*=\s*["']?(stylesheet|preconnect)/i.test(tag) && href && isRemote(href)) remoteLinks.push(tag.replace(/\s*\/?>$/, ' />'));
    });
    const remoteScripts = [];
    const parts = [];
    let usedOwn = false;
    const ownScript = String(src.js || '');
    html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => {
      const type = (/\btype\s*=\s*["']([^"']+)["']/i.exec(attrs) || [])[1];
      if (type && !/javascript|ecmascript/i.test(type)) return m;
      const s = (/\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs) || [])[1];
      if (s && isRemote(s)) remoteScripts.push(`<script src="${s}"></script>`);
      else if (s) { if (!usedOwn) { parts.push(ownScript); usedOwn = true; } }
      else if (body.trim()) parts.push(body);
      return m;
    });
    if (!usedOwn && ownScript) parts.unshift(ownScript);
    const markup = A.isolateSectionMarkup(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => {
      const type = (/\btype\s*=\s*["']([^"']+)["']/i.exec(m) || [])[1];
      return type && !/javascript|ecmascript/i.test(type) ? m : '';
    }), id);
    return {
      id, markup,
      css: A.scopeSectionStyles(src.css || '', id, !!src.ownPalette),
      js: A.isolateSectionScript(parts.join('\n;\n'), id),
      remoteLinks, remoteScripts
    };
  }

  const plainSectionSource = (slug, id) => `import { useEffect, useRef } from "react"
import { runPlainScript } from "../lib/plain"
import html from "../legacy/${slug}.html?raw"
import js from "../legacy/${slug}.js?raw"

// This section is plain HTML, CSS and JS: the markup is shown as it is and its script runs once after it mounts.
export default function Section() {
  const host = useRef<HTMLElement>(null)
  useEffect(() => { if (host.current) runPlainScript(host.current, js, ${JSON.stringify(slug)}) }, [])
  return <section ref={host} id="${id}" className="page-section" dangerouslySetInnerHTML={{ __html: html }} />
}
`;

  const plainRuntimeSource = `// Runs a plain section's script once. The page has already loaded, so listeners for DOMContentLoaded and load that the
// script adds are run right away instead of never. Safe under React StrictMode (the second mount does nothing).
export function runPlainScript(host: HTMLElement, js: string, name: string): void {
  if (host.dataset.ran === "1" || !js.trim()) return
  host.dataset.ran = "1"
  const patched: Array<[EventTarget, EventTarget["addEventListener"]]> = []
  const replay = (target: EventTarget) => {
    const original = target.addEventListener.bind(target)
    patched.push([target, target.addEventListener])
    target.addEventListener = ((type: string, fn: any, opts?: any) => {
      if (type === "DOMContentLoaded" || type === "load") setTimeout(() => { try { typeof fn === "function" ? fn(new Event(type)) : fn.handleEvent(new Event(type)) } catch (e) { console.error(e) } }, 0)
      else original(type, fn, opts)
    }) as typeof target.addEventListener
  }
  replay(document)
  replay(window)
  try {
    new Function(js)()
  } catch (e) {
    console.error("Section " + name + " failed to start:", e)
  } finally {
    patched.forEach(([target, fn]) => { target.addEventListener = fn })
  }
}
`;

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
  --preview-bg: ${t.bg};
  --preview-text: ${t.text};
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
    const plainSlugs = [];
    const extraHead = new Set();

    stack.filter(s => !s.hidden).forEach((s) => {
      const slug = s.slug;
      if (!slug) return;
      order.push(slug);
      if (seen.has(slug)) return;
      seen.add(slug);
      const src = sources[slug];
      const reason = unsupportedReason(slug, src);
      if (reason) { skipped.push({ slug, title: (src && src.title) || slug, reason }); return; }
      included.push(slug);
      if (isReactSource(src)) {
        files[`src/components/ui/${slug}.tsx`] = src.component;
        files[`src/sections/${slug}.tsx`] = src.demo;
        files[`src/styles/${slug}.css`] = src.css || '';
        [src.component, src.demo, src.css || ''].forEach(text => A.findLocalAssetUrls(text).forEach(u => assetUrls.add(u)));
        [...importsOf(src.component), ...importsOf(src.demo)].forEach(spec => {
          if (spec.startsWith('@/') || spec.startsWith('.') || PROVIDED.has(spec)) return;
          const pkg = packageOf(spec);
          if (!PROVIDED.has(pkg)) deps[pkg] = KNOWN_VERSIONS[pkg] || 'latest';
        });
      } else {
        const plain = splitPlainFeature(slug, src);
        plainSlugs.push(slug);
        files[`src/legacy/${slug}.html`] = plain.markup;
        files[`src/legacy/${slug}.js`] = plain.js;
        files[`src/styles/${slug}.css`] = plain.css;
        files[`src/sections/${slug}.tsx`] = plainSectionSource(slug, plain.id);
        plain.remoteLinks.forEach(l => extraHead.add(l));
        plain.remoteScripts.forEach(l => extraHead.add(l));
        [plain.markup, plain.css, plain.js].forEach(text => A.findLocalAssetUrls(text).forEach(u => assetUrls.add(u)));
      }
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
    if (plainSlugs.length) {
      files['src/lib/plain.ts'] = plainRuntimeSource;
      files['src/vite-env.d.ts'] = '/// <reference types="vite/client" />\n';
    }

    const head = A.renderPageHead(page || {}, 'My site');
    files['index.html'] = `<!doctype html>
<html lang="${head.lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${head.headTags}
    ${Array.from(extraHead).join('\n    ')}
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

A Vite + React + TypeScript project assembled from your page. Each section is a file in \`src/sections/\` with its styles in \`src/styles/\`. Sections that started as React components keep their component in \`src/components/ui/\` and a small demo wrapper (edit it to change the text and options). Plain HTML sections keep their markup and script in \`src/legacy/\` (edit the \`.html\` file to change the text); their script runs once after the section mounts.

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

These sections cannot be carried over:

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
