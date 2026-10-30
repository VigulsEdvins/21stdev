/**
 * CMS export: every ZIP can carry a content editor (admin.html) next to the page, like the full-website templates.
 *
 * - discoverPages(): renders each page off-screen and lists its editable fields (the same detection as the Content tab).
 * - buildContent(): the cms-content.js file that tells the editor and the page what can be edited.
 * - injectTags(): adds cms-content.js and cms.js after a page's own script.
 * - runtimeFiles(): admin.html, admin.css, admin.js, cms.js and form-rules.js, fetched from scripts/cms/.
 */
(function () {
  'use strict';

  const RUNTIME_FILES = ['admin.html', 'admin.css', 'admin.js', 'cms.js', 'form-rules.js'];
  const MAX_FIELDS_PER_SECTION = 60;

  /** The cms-content.js text. `pages` is [{ file, title, sections: [{ id, slug, title, fields: [...] }] }]. */
  function buildContent({ site, siteLang = '', pages, published = {}, updatedAt = 0, forms = null }) {
    const data = {
      v: 1,
      site: site || 'Website',
      updatedAt,
      ...(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(siteLang) ? { siteLang } : {}),
      pages: pages.map(p => ({
        file: p.file,
        title: p.title,
        ...(p.lang ? { lang: String(p.lang), group: String(p.group || p.file) } : {}),
        sections: p.sections.map(s => ({
          id: s.id,
          slug: s.slug,
          title: s.title,
          ...(s.anchor ? { anchor: String(s.anchor) } : {}),
          ...(s.hasForm ? { form: true } : {}),
          fields: s.fields.map(f => {
            const out = { id: f.id, label: f.label, type: f.type, selector: f.selector, value: f.value };
            if (f.attr) out.attr = f.attr;
            if (f.fit) out.fit = f.fit;
            return out;
          })
        }))
      })),
      forms: forms && typeof forms === 'object' ? { method: String(forms.method || ''), target: String(forms.target || ''), has: !!forms.has } : { method: '', target: '', has: false },
      published
    };
    // '<' is escaped so no editable text can close a script tag
    const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
    return `/* Content of the editor (admin.html). Replace this file with the one you download there to change the live site. */\nwindow.EDV_CMS = ${json};\n`;
  }

  /** Adds the two CMS scripts right after the page's own script tag. Throws when the tag is not found. */
  function injectTags(html, scriptName) {
    // exported pages load their script with defer (so the page paints first); the editor scripts follow in the same order
    const tag = [`<script defer src="${scriptName}"></script>`, `<script src="${scriptName}"></script>`].find(t => html.includes(t));
    if (!tag) throw new Error(`CMS: ${scriptName} is not linked in the page`);
    const defer = tag.includes(' defer') ? ' defer' : '';
    return html.replace(tag, `${tag}\n  <script${defer} src="cms-content.js"></script>\n  <script${defer} src="cms.js"></script>`);
  }

  function readmeSection(pageFiles) {
    return `\n## Content editor (admin.html)

\`admin.html\` is a content editor for this site: it lists every section of ${pageFiles.length > 1 ? 'each page' : 'the page'} with its headings, text, pictures, links and colours, shows a live preview (click anything in it to edit that item) and keeps undo/redo.

How it works:

1. Open \`admin.html\` from the site's folder (served by a web host or \`npx serve .\`; double-clicking works in most browsers too).
2. Change content and press **Publish**. The site you open in the same browser shows the changes straight away.
3. Open **Publishing & backup**, press **Download cms-content.js** and upload that file over the old one, next to \`index.html\`. Every visitor then sees the new content.

Files: \`admin.html\`, \`admin.css\`, \`admin.js\` (the editor), \`form-rules.js\` (the checks for the Form messages tab), \`cms.js\` (applies the content on ${pageFiles.length > 1 ? 'every page' : 'the page'}) and \`cms-content.js\` (the list of editable fields and the published content).

There is no login. Anyone who can open \`admin.html\` can edit in their own browser, but only the \`cms-content.js\` you upload changes the live site. If you do not want the editor to be public, do not upload \`admin.html\`, \`admin.css\` and \`admin.js\` to the host and keep them on your own computer next to a copy of the site. Re-export from the builder when you add or remove sections, because the editor's field list is fixed at export time.
`;
  }

  async function runtimeFiles(fetchFn) {
    const out = {};
    for (const name of RUNTIME_FILES) {
      const res = await fetchFn(`scripts/cms/${name}`);
      if (!res.ok) throw new Error(`CMS: could not load scripts/cms/${name}`);
      out[name] = await res.text();
    }
    return out;
  }

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  /**
   * Renders `html` in a hidden, tall frame (so lazily started sections are "on screen") and lists the editable fields of
   * every section. `explicitFor(slug)` returns the feature's named field list (or undefined for automatic detection).
   */
  async function discoverSections({ html, sections, discoverFields, explicitFor, doc = document }) {
    const frame = doc.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:16000px;border:0;opacity:0;pointer-events:none;visibility:hidden';
    doc.body.appendChild(frame);
    try {
      await Promise.race([
        (window.FrameDoc ? window.FrameDoc.write(frame, html) : new Promise(resolve => { frame.addEventListener('load', resolve, { once: true }); frame.srcdoc = html; })),
        new Promise(resolve => setTimeout(resolve, 15000))
      ]);
      await wait(900);
      const pdoc = frame.contentDocument;
      const collect = async () => {
        const result = [];
        for (const s of sections) {
          const root = pdoc && pdoc.getElementById(s.id);
          const explicit = await explicitFor(s.slug);
          const found = root ? discoverFields(root, explicit, { limit: MAX_FIELDS_PER_SECTION }) : [];
          result.push({
            id: s.id, slug: s.slug, title: s.title,
            // a section with a message form also shows the "where should messages go" card in the editor
            hasForm: !!(root && root.querySelector('form[data-edv-form="message"]')),
            // a picture also carries how it fills its frame (crop or fit, focus, zoom), as the builder has it
            fields: found.map(f => {
              const out = { id: f.id, label: f.label, type: f.type, selector: f.selector, attr: f.attr, value: String(f.current == null ? '' : f.current) };
              if (f.type === 'image') out.fit = String(((s.overrides || {})[f.id + '__fit'] || {}).value || 'cover|50|50|100');
              return out;
            })
          });
        }
        return result;
      };
      let result = await collect();
      // sections that draw themselves from script may need a moment more
      if (result.some(r => !r.fields.length)) { await wait(900); result = await collect(); }
      return result;
    } finally {
      frame.remove();
    }
  }

  const inlineScript = (code) => `<script>${String(code).replace(/<\/(script)/gi, '<\\/$1')}</script>`;

  /**
   * One self-contained HTML page of the editor for the builder's "preview": admin.css/js and the content are inlined and
   * each page's document is handed to the editor's preview frame, so no files or server are needed.
   * `docs` maps a page file to its single-file HTML.
   */
  function buildPreviewPage({ files, docs }) {
    const frames = {};
    Object.keys(docs).forEach(file => {
      const cfg = `window.__EDV_CMS_FRAME=${JSON.stringify({ file })};`;
      const extra = [cfg, files['cms-content.js'], files['cms.js']].map(inlineScript).join('\n');
      const at = docs[file].lastIndexOf('</body>');
      frames[file] = at < 0 ? docs[file] + extra : docs[file].slice(0, at) + extra + '\n' + docs[file].slice(at);
    });
    const framesJson = JSON.stringify(frames).replace(/</g, '\\u003c');
    return files['admin.html']
      .replace('<link rel="stylesheet" href="admin.css">', () => `<style>${files['admin.css']}</style>`)
      .replace('<script src="cms-content.js"></script>', () => inlineScript(files['cms-content.js']) + `\n  <script>window.EDV_CMS_FRAMES=${framesJson};</script>`)
      .replace('<script src="form-rules.js"></script>', () => inlineScript(files['form-rules.js']))
      .replace('<script src="admin.js"></script>', () => inlineScript(files['admin.js']));
  }

  const api = { buildPreviewPage, RUNTIME_FILES, buildContent, injectTags, readmeSection, runtimeFiles, discoverSections };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderCms = api;
})();
