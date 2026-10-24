/**
 * Builder extras: client projects modal, page settings form and the client Content editor.
 * Kept out of builder.js on purpose; builder.js hands over what it owns via the `ctx` object.
 *   window.BuilderExtras.create(ctx) -> { onStateSaved(state), onContentTabShown() }
 * Pure helpers (discoverFields) are also exported for tests.
 */
(function (root) {
  const INLINE_TAGS = new Set(['B', 'I', 'EM', 'STRONG', 'SPAN', 'BR', 'SMALL', 'MARK', 'SUP', 'SUB', 'U', 'A']);
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'CANVAS', 'IFRAME', 'TEMPLATE']);
  const TEXT_CANDIDATES = 'h1,h2,h3,h4,h5,h6,p,a,button,li,figcaption,blockquote,label,span,div,td,th,dt,dd';
  const TAG_LABELS = { h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', h5: 'Heading 5', h6: 'Heading 6', p: 'Paragraph', a: 'Link text', button: 'Button', li: 'List item', figcaption: 'Caption', blockquote: 'Quote', label: 'Label' };
  const MAX_TEXT_FIELDS = 14;
  const MAX_IMAGE_FIELDS = 6;
  const MAX_LINK_FIELDS = 6;

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function shortHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  /** CSS path from `rootEl` down to `el`, scoped with :scope so it can be re-resolved with root.querySelector. */
  function selectorFor(el, rootEl) {
    const parts = [];
    for (let node = el; node && node !== rootEl; node = node.parentElement) {
      const tag = node.tagName.toLowerCase();
      let n = 1;
      for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
        if (sib.tagName === node.tagName) n++;
      }
      parts.unshift(`${tag}:nth-of-type(${n})`);
    }
    return ':scope > ' + parts.join(' > ');
  }

  function isHidden(el, rootEl) {
    for (let node = el; node && node !== rootEl; node = node.parentElement) {
      if (SKIP_TAGS.has(node.tagName.toUpperCase())) return true;
      if (node.classList && (node.classList.contains('section-overlay-layer') || node.classList.contains('section-resize-handle'))) return true;
      if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') return true;
    }
    return false;
  }

  function isTextLeaf(el) {
    return Array.from(el.children).every(c => INLINE_TAGS.has(c.tagName) && !c.querySelector('*:not(br):not(b):not(i):not(em):not(strong):not(span)'));
  }

  function snippet(text, n = 34) {
    const t = text.replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  /**
   * Finds editable content inside one rendered section.
   * `explicit` is the feature's meta.json `customizable` list; when present it wins over discovery.
   * @returns {Array<{id,label,type,selector,attr?,current,auto}>}
   */
  /**
   * The colour an element shows for a property or custom property, as #rrggbb (what <input type=color> needs).
   * Reads the computed value, so a colour set by the component's own stylesheet is found, not just inline ones.
   */
  function currentColor(el, attr) {
    let raw = '';
    try {
      raw = (el.style.getPropertyValue(attr) || (el.ownerDocument.defaultView || window).getComputedStyle(el).getPropertyValue(attr) || '').trim();
    } catch (_) { return ''; }
    if (!raw) return '';
    // let the browser resolve names, rgb() and var() references to rgb
    const probe = el.ownerDocument.createElement('span');
    probe.style.color = raw;
    if (!probe.style.color) return '';
    el.ownerDocument.body.appendChild(probe);
    const rgb = (el.ownerDocument.defaultView || window).getComputedStyle(probe).color;
    probe.remove();
    const m = rgb.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/);
    return m ? '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('') : '';
  }

  function discoverFields(sectionEl, explicit, opts = {}) {
    if (!sectionEl) return [];
    const maxText = opts.limit || MAX_TEXT_FIELDS;
    const maxImages = opts.limit || MAX_IMAGE_FIELDS;
    const maxLinks = opts.limit || MAX_LINK_FIELDS;
    const fields = [];

    if (Array.isArray(explicit) && explicit.length) {
      explicit.forEach(def => {
        let el = null;
        try { el = sectionEl.querySelector(def.selector); } catch (_) { /* bad selector in meta */ }
        if (!el) return;
        const type = def.type || 'text';
        const current = type === 'image' ? (el.getAttribute('src') || '') : type === 'link' ? (el.getAttribute('href') || '') : type === 'color' ? currentColor(el, def.attr || 'color') : el.textContent.trim();
        fields.push({ id: def.id, label: def.label || def.id, type, selector: def.selector, attr: def.attr, current, auto: false });
      });
      return fields;
    }

    let textCount = 0;
    const collected = [];
    sectionEl.querySelectorAll(TEXT_CANDIDATES).forEach(el => {
      if (textCount >= maxText || isHidden(el, sectionEl) || !isTextLeaf(el)) return;
      // Parents come first in document order: an element inside one we already list is part of its text
      if (collected.some(c => c.contains(el))) return;
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (text.length < 2 || text.length > 220) return;
      // Skip wrappers whose text is fully inside a child we will list anyway
      if (el.children.length && Array.from(el.children).some(c => c.textContent.trim() === text && !INLINE_TAGS.has(c.tagName))) return;
      const selector = selectorFor(el, sectionEl);
      collected.push(el);
      fields.push({ id: `auto-${shortHash(selector + 'text')}`, label: `${TAG_LABELS[el.tagName.toLowerCase()] || 'Text'}: ${snippet(text)}`, type: 'text', selector, current: text, auto: true });
      textCount++;
    });

    let imgCount = 0;
    sectionEl.querySelectorAll('img').forEach(img => {
      if (imgCount >= maxImages || isHidden(img, sectionEl)) return;
      const src = img.getAttribute('src') || '';
      if (!src) return;
      const selector = selectorFor(img, sectionEl);
      fields.push({ id: `auto-${shortHash(selector + 'image')}`, label: `Image: ${snippet(img.getAttribute('alt') || src.split('/').pop() || 'image', 30)}`, type: 'image', selector, current: src, auto: true });
      imgCount++;
    });

    let linkCount = 0;
    sectionEl.querySelectorAll('a[href]').forEach(a => {
      if (linkCount >= maxLinks || isHidden(a, sectionEl)) return;
      const selector = selectorFor(a, sectionEl);
      fields.push({ id: `auto-${shortHash(selector + 'link')}`, label: `Link to: ${snippet(a.textContent || a.getAttribute('href'), 28)}`, type: 'link', selector, current: a.getAttribute('href') || '', auto: true });
      linkCount++;
    });

    return fields;
  }

  function create(ctx) {
    const doc = root.document;
    const sm = ctx.stackManager;
    const ProjectStore = root.ProjectStore;
    const safeStorage = (() => {
      try { return root.localStorage; } catch (_) { return { getItem: () => null, setItem: () => { throw new Error('no storage'); } }; }
    })();
    const store = ProjectStore.createProjectStore(safeStorage);

    // ---------------------------------------------------------------- Projects
    if (!store.activeId()) {
      try { store.create({ name: 'My first project', state: ctx.serializeState() }); } catch (_) { /* storage unavailable */ }
    }

    const projectsBtn = doc.getElementById('projectsBtn');
    const projectNameLabel = doc.getElementById('projectNameLabel');
    const modal = doc.getElementById('projectsModal');
    const modalBody = doc.getElementById('projectsModalBody');
    const closeBtn = doc.getElementById('closeProjectsModalBtn');
    const backdrop = doc.getElementById('projectsModalBackdrop');

    function activeProject() {
      const id = store.activeId();
      return id ? store.get(id) : null;
    }

    function refreshLabel() {
      const p = activeProject();
      if (projectNameLabel) projectNameLabel.textContent = p ? p.name : 'Project';
      if (projectsBtn) projectsBtn.title = p ? `Client projects (current: ${p.name}${p.client ? ' — ' + p.client : ''})` : 'Client projects';
    }

    function fmtDate(iso) {
      try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (_) { return iso; }
    }

    function renderProjects() {
      if (!modalBody) return;
      const active = activeProject();
      const list = store.list();
      const snaps = active ? store.snapshots(active.id) : [];
      const starters = root.BuilderStarters ? root.BuilderStarters.listStarters(ctx.getRegistry()) : [];
      modalBody.innerHTML = `
        ${active ? `
        <section class="proj-section">
          <h3 class="proj-heading">Current project</h3>
          <div class="proj-form">
            <label class="ps-field"><span>Project name</span><input type="text" id="projName" maxlength="120" value="${escapeHtml(active.name)}" /></label>
            <label class="ps-field"><span>Client</span><input type="text" id="projClient" maxlength="120" value="${escapeHtml(active.client)}" /></label>
            <label class="ps-field proj-wide"><span>Notes</span><textarea id="projNotes" rows="3" maxlength="5000" placeholder="Brief, links, feedback rounds…">${escapeHtml(active.notes)}</textarea></label>
          </div>
        </section>` : ''}
        <div class="proj-actions">
          <button type="button" class="builder-btn-primary" id="projSnapshotBtn">Save snapshot</button>
          <button type="button" class="builder-btn-subtle" id="projCopyBtn">Save as new project</button>
          <button type="button" class="builder-btn-subtle" id="projBlankBtn">New blank page</button>
          ${starters.length ? `<select id="projStarterSelect" class="builder-select" aria-label="Starter page">${starters.map(s => `<option value="${escapeHtml(s.industry)}">${escapeHtml(s.label)} starter (${s.sections.length} sections)</option>`).join('')}</select>
          <button type="button" class="builder-btn-subtle" id="projStarterBtn">New from starter</button>` : ''}
          <button type="button" class="builder-btn-subtle" id="projExportBtn">Export file</button>
          <button type="button" class="builder-btn-subtle" id="projImportBtn">Import file</button>
          <input type="file" id="projImportInput" accept="application/json,.json" hidden />
        </div>
        <section class="proj-section">
          <h3 class="proj-heading">All projects (${list.length})</h3>
          <ul class="proj-list">
            ${list.map(p => `
              <li class="proj-item${active && p.id === active.id ? ' is-active' : ''}">
                <div class="proj-item-main">
                  <strong>${escapeHtml(p.name)}</strong>
                  <span class="proj-meta">${escapeHtml(p.client || 'No client')} · ${p.sections} sections · ${p.snapshots} snapshots · ${escapeHtml(fmtDate(p.updatedAt))}</span>
                </div>
                <div class="proj-item-actions">
                  ${active && p.id === active.id ? '<span class="proj-badge">Open</span>' : `<button type="button" class="builder-btn-subtle" data-open="${p.id}">Open</button>`}
                  <button type="button" class="builder-btn-subtle proj-danger" data-delete="${p.id}" aria-label="Delete ${escapeHtml(p.name)}">Delete</button>
                </div>
              </li>`).join('')}
          </ul>
        </section>
        ${active ? `
        <section class="proj-section">
          <h3 class="proj-heading">Snapshots of “${escapeHtml(active.name)}” (${snaps.length}/${ProjectStore.MAX_SNAPSHOTS})</h3>
          ${snaps.length ? `<ul class="proj-list">${snaps.map(s => `
            <li class="proj-item">
              <div class="proj-item-main"><strong>${escapeHtml(s.label)}</strong><span class="proj-meta">${s.sections} sections · ${escapeHtml(fmtDate(s.at))}</span></div>
              <div class="proj-item-actions">
                <button type="button" class="builder-btn-subtle" data-restore="${s.id}">Restore</button>
                <button type="button" class="builder-btn-subtle proj-danger" data-delete-snap="${s.id}">Delete</button>
              </div>
            </li>`).join('')}</ul>` : '<p class="content-empty">No snapshots yet. Save one before sending a version to the client.</p>'}
        </section>` : ''}`;
      wireProjects();
    }

    function saveCurrentIntoStore() {
      const id = store.activeId();
      if (id) store.saveState(id, ctx.serializeState());
    }

    function switchTo(id) {
      saveCurrentIntoStore();
      const p = store.get(id);
      if (!p) return;
      store.setActive(id);
      ctx.applyState(p.state);
      refreshLabel();
      renderProjects();
      ctx.showToast(`Opened “${p.name}”`);
    }

    function wireProjects() {
      const q = sel => modalBody.querySelector(sel);
      const id = store.activeId();
      const bindText = (sel, field) => {
        const el = q(sel);
        if (el) el.addEventListener('change', () => { store.update(id, { [field]: el.value }); refreshLabel(); if (field === 'name') renderProjects(); });
      };
      bindText('#projName', 'name');
      bindText('#projClient', 'client');
      bindText('#projNotes', 'notes');

      q('#projSnapshotBtn').addEventListener('click', () => {
        saveCurrentIntoStore();
        const label = root.prompt('Name this snapshot', `Version ${store.snapshots(id).length + 1}`);
        if (label === null) return;
        if (store.snapshot(id, label)) { ctx.showToast('Snapshot saved'); renderProjects(); } else ctx.showToast('Could not save: browser storage is full');
      });
      q('#projCopyBtn').addEventListener('click', () => {
        const name = root.prompt('Name for the new project', `${(activeProject() || {}).name || 'Project'} copy`);
        if (!name) return;
        try {
          saveCurrentIntoStore();
          store.create({ name, client: (activeProject() || {}).client || '', state: ctx.serializeState() });
          refreshLabel(); renderProjects(); ctx.showToast(`Created “${name}”`);
        } catch (e) { ctx.showToast(e.message); }
      });
      const starterBtn = q('#projStarterBtn');
      if (starterBtn) starterBtn.addEventListener('click', () => {
        const industry = q('#projStarterSelect').value;
        const starter = (root.BuilderStarters ? root.BuilderStarters.listStarters(ctx.getRegistry()) : []).find(s => s.industry === industry);
        if (!starter) return;
        const name = root.prompt(`Name for the new ${starter.label.toLowerCase()} project`, 'New client');
        if (!name) return;
        try {
          saveCurrentIntoStore();
          const blank = { stack: [], theme: 'midnight-dark', customColors: {}, page: { ...(root.StackManager && root.StackManager.DEFAULT_PAGE) }, viewport: 'desktop' };
          store.create({ name, state: blank });
          ctx.applyState(blank);
          starter.sections.forEach(s => sm.addSection(s.slug, { title: s.title, category: s.category }));
          refreshLabel(); renderProjects(); ctx.showToast(`Started “${name}” from the ${starter.label.toLowerCase()} starter`);
        } catch (e) { ctx.showToast(e.message); }
      });
      q('#projBlankBtn').addEventListener('click', () => {
        const name = root.prompt('Name for the blank project', 'New client');
        if (!name) return;
        try {
          saveCurrentIntoStore();
          const blank = { stack: [], theme: 'midnight-dark', customColors: {}, page: { ...(root.StackManager && root.StackManager.DEFAULT_PAGE) }, viewport: 'desktop' };
          store.create({ name, state: blank });
          ctx.applyState(blank);
          refreshLabel(); renderProjects(); ctx.showToast(`Started “${name}”`);
        } catch (e) { ctx.showToast(e.message); }
      });
      q('#projExportBtn').addEventListener('click', () => {
        saveCurrentIntoStore();
        const json = store.exportProject(id, { favourites: ctx.getFavourites() });
        if (!json) return;
        const p = store.get(id);
        const blob = new Blob([json], { type: 'application/json' });
        const a = doc.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${(p.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}.webbuilder.json`;
        doc.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        ctx.showToast('Project file downloaded');
      });
      const importInput = q('#projImportInput');
      q('#projImportBtn').addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', async () => {
        const file = importInput.files && importInput.files[0];
        if (!file) return;
        try {
          saveCurrentIntoStore();
          const p = store.importProject(await file.text());
          const added = ctx.mergeFavourites(p.extras && p.extras.favourites);
          ctx.applyState(p.state);
          refreshLabel(); renderProjects(); ctx.showToast(`Imported “${p.name}”${added ? ` and ${added} starred component${added === 1 ? '' : 's'}` : ''}`);
        } catch (e) { ctx.showToast(e.message); }
      });

      modalBody.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => switchTo(b.dataset.open)));
      modalBody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => {
        const p = store.get(b.dataset.delete);
        if (!p || !root.confirm(`Delete project “${p.name}” and its snapshots? This cannot be undone.`)) return;
        const wasActive = b.dataset.delete === store.activeId();
        store.remove(b.dataset.delete);
        if (wasActive) {
          const next = store.activeId();
          if (next) ctx.applyState(store.get(next).state);
          else { store.create({ name: 'My first project', state: ctx.serializeState() }); }
        }
        refreshLabel(); renderProjects();
      }));
      modalBody.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', () => {
        const state = store.restoreSnapshot(id, b.dataset.restore);
        if (!state) return;
        if (!root.confirm('Replace the current page with this snapshot? Save a snapshot first if you want to keep the current page.')) return;
        ctx.applyState(state); saveCurrentIntoStore(); ctx.showToast('Snapshot restored');
      }));
      modalBody.querySelectorAll('[data-delete-snap]').forEach(b => b.addEventListener('click', () => {
        store.deleteSnapshot(id, b.dataset.deleteSnap); renderProjects();
      }));
    }

    function openModal() {
      if (!modal) return;
      saveCurrentIntoStore();
      renderProjects();
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      if (closeBtn) closeBtn.focus();
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      if (projectsBtn) projectsBtn.focus();
    }
    if (projectsBtn) projectsBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);
    doc.addEventListener('keydown', e => { if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) closeModal(); });
    refreshLabel();

    // ----------------------------------------------------------- Page settings
    const pageInputs = {
      title: doc.getElementById('pageTitleInput'),
      description: doc.getElementById('pageDescInput'),
      favicon: doc.getElementById('pageFaviconInput'),
      fontDisplay: doc.getElementById('pageFontDisplayInput'),
      fontBody: doc.getElementById('pageFontBodyInput'),
      lang: doc.getElementById('pageLangInput'),
      shareImage: doc.getElementById('pageShareImageInput'),
      canonical: doc.getElementById('pageCanonicalInput'),
      robots: doc.getElementById('pageRobotsInput'),
      bizType: doc.getElementById('pageBizTypeInput'),
      bizName: doc.getElementById('pageBizNameInput'),
      bizPhone: doc.getElementById('pageBizPhoneInput'),
      bizAddress: doc.getElementById('pageBizAddressInput')
    };
    let pageTimer = null;
    let pendingPage = {};
    let lastPageJson = '';
    function syncPageInputs() {
      const page = sm.getState().page || {};
      const json = JSON.stringify(page);
      if (json === lastPageJson) return;
      lastPageJson = json;
      Object.entries(pageInputs).forEach(([k, el]) => { if (el && doc.activeElement !== el) el.value = page[k] || ''; });
    }
    Object.entries(pageInputs).forEach(([key, el]) => {
      if (!el) return;
      el.addEventListener('input', () => {
        pendingPage[key] = el.value.trim();
        clearTimeout(pageTimer);
        // Batched: every page change reloads the preview, and edits to several fields must all land
        pageTimer = setTimeout(() => { const batch = pendingPage; pendingPage = {}; sm.setPage(batch); }, 450);
      });
    });
    syncPageInputs();

    // ---------------------------------------------------------- Content editor
    const sectionSelect = doc.getElementById('contentSectionSelect');
    const fieldsEl = doc.getElementById('contentFields');
    const emptyEl = doc.getElementById('contentEmpty');
    const contentPane = doc.getElementById('paneContent');
    let selectedSectionId = null;

    function contentTabVisible() {
      return !!contentPane && contentPane.classList.contains('is-active');
    }

    function populateSectionSelect() {
      if (!sectionSelect) return;
      const stack = sm.getStack();
      const active = ctx.getActiveSection();
      if (!selectedSectionId || !stack.some(s => s.id === selectedSectionId)) selectedSectionId = (active && active.id) || (stack[0] && stack[0].id) || null;
      sectionSelect.innerHTML = stack.map((s, i) => `<option value="${escapeHtml(s.id)}">${i + 1}. ${escapeHtml(s.title || s.slug)}</option>`).join('');
      if (selectedSectionId) sectionSelect.value = selectedSectionId;
      if (emptyEl) emptyEl.hidden = stack.length > 0;
    }

    function readImageAsDataUri(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read that file'));
        reader.onload = () => {
          const img = new root.Image();
          img.onerror = () => reject(new Error('That file is not a usable image'));
          img.onload = () => {
            const max = 1400;
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = doc.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const uri = canvas.toDataURL('image/webp', 0.85);
            if (uri.length > 900 * 1024) reject(new Error(`That image is still ${Math.round(uri.length / 1024)} KB after shrinking, too big to keep in the browser. Host it and paste its URL instead.`));
            else resolve(uri);
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    let renderRetries = 0;
    /** Rough size of everything this origin keeps in localStorage (UTF-16, so 2 bytes per character). */
    function storageUsedBytes() {
      try {
        let n = 0;
        for (let i = 0; i < safeStorage.length; i++) {
          const k = safeStorage.key(i);
          n += (k.length + (safeStorage.getItem(k) || '').length) * 2;
        }
        return n;
      } catch (_) { return 0; }
    }

    function renderContentFields() {
      if (!fieldsEl) return;
      populateSectionSelect();
      const stack = sm.getStack();
      const section = stack.find(s => s.id === selectedSectionId);
      fieldsEl.innerHTML = '';
      if (!section) return;
      const pdoc = ctx.getPreviewDoc();
      const sectionEl = pdoc && pdoc.getElementById(section.id);
      if (!sectionEl || pdoc.readyState !== 'complete') {
        fieldsEl.innerHTML = '<p class="content-empty">The preview is loading…</p>';
        if (renderRetries++ < 20) setTimeout(() => { if (contentTabVisible()) renderContentFields(); }, 300);
        return;
      }
      renderRetries = 0;
      const feature = ctx.getRegistry().find(f => f.slug === section.slug);
      const fields = discoverFields(sectionEl, feature && feature.customizable);
      if (!fields.length) {
        fieldsEl.innerHTML = '<p class="content-empty">No editable text, images or links were found in this section.</p>';
        return;
      }
      const overrides = section.overrides || {};
      const hint = fields[0].auto ? '<p class="content-hint">Fields were detected automatically from the rendered section.</p>' : '';
      fieldsEl.innerHTML = hint;
      fields.forEach(f => {
        const ov = overrides[f.id];
        const value = ov ? ov.value : f.current;
        const wrap = doc.createElement('div');
        wrap.className = 'content-field' + (ov ? ' is-edited' : '');
        const long = f.type === 'text' && (value.length > 60 || value.includes('\n'));
        const isData = f.type === 'image' && /^data:/.test(value);
        wrap.innerHTML = `
          <label class="ps-field">
            <span>${escapeHtml(f.label)}${ov ? ' <em class="content-edited-dot" title="Edited">●</em>' : ''}</span>
            ${long ? `<textarea rows="3"></textarea>` : `<input type="${f.type === 'image' || f.type === 'link' ? 'text' : f.type === 'color' ? 'color' : 'text'}" autocomplete="off" />`}
          </label>
          ${f.type === 'image' ? `<div class="content-image-row"><img class="content-thumb" alt="" src="${escapeHtml(value)}" /><button type="button" class="builder-btn-subtle content-upload">Upload…</button><input type="file" accept="image/*" hidden /></div><p class="content-hint">Uploads are shrunk and kept in your browser. For large photos, host them and paste the URL above.</p>` : ''}
          ${ov ? '<button type="button" class="content-reset">Reset to original</button>' : ''}`;
        const input = wrap.querySelector('textarea, input:not([type=file])');
        input.value = isData ? '(uploaded image)' : value;
        if (isData) input.readOnly = true;
        let timer = null;
        const addReset = () => {
          // first edit of this field: offer "Reset to original" now, without re-rendering (that would drop focus)
          if (wrap.querySelector('.content-reset')) return;
          wrap.classList.add('is-edited');
          const label = wrap.querySelector('label.ps-field > span');
          if (label && !label.querySelector('.content-edited-dot')) label.insertAdjacentHTML('beforeend', ' <em class="content-edited-dot" title="Edited">●</em>');
          const b = doc.createElement('button');
          b.type = 'button';
          b.className = 'content-reset';
          b.textContent = 'Reset to original';
          b.addEventListener('click', () => { sm.setSectionOverride(section.id, f.id, ''); setTimeout(renderContentFields, 50); });
          wrap.appendChild(b);
        };
        input.addEventListener('input', () => {
          clearTimeout(timer);
          timer = setTimeout(() => { sm.setSectionOverride(section.id, f.id, input.value, { selector: f.selector, type: f.type, attr: f.attr }); addReset(); }, 250);
        });
        const reset = wrap.querySelector('.content-reset');
        if (reset) reset.addEventListener('click', () => { sm.setSectionOverride(section.id, f.id, ''); setTimeout(renderContentFields, 50); });
        const upload = wrap.querySelector('.content-upload');
        if (upload) {
          const fileInput = wrap.querySelector('input[type=file]');
          upload.addEventListener('click', () => fileInput.click());
          fileInput.addEventListener('change', async () => {
            if (!fileInput.files[0]) return;
            try {
              const uri = await readImageAsDataUri(fileInput.files[0]);
              sm.setSectionOverride(section.id, f.id, uri, { selector: f.selector, type: 'image' });
              const used = storageUsedBytes();
              ctx.showToast(used > 3.5 * 1024 * 1024
                ? `Image replaced, but browser storage is ${(used / 1048576).toFixed(1)} MB of about 5 MB. Export the project file and host big photos instead.`
                : 'Image replaced', used > 3.5 * 1024 * 1024 ? 6000 : undefined);
              setTimeout(renderContentFields, 50);
            } catch (e) { ctx.showToast(e.message); }
          });
        }
        fieldsEl.appendChild(wrap);
      });
    }

    if (sectionSelect) {
      sectionSelect.addEventListener('change', () => {
        selectedSectionId = sectionSelect.value;
        ctx.setActiveSection(selectedSectionId);
        renderContentFields();
      });
    }

    // Keep the Content list in step with the page without re-rendering while someone is typing.
    let lastStackSignature = '';
    sm.subscribe(() => {
      syncPageInputs();
      if (!contentTabVisible()) return;
      const sig = sm.getStack().map(s => s.id).join('|');
      if (sig !== lastStackSignature) { lastStackSignature = sig; setTimeout(renderContentFields, 400); }
    });

    return {
      onStateSaved(state) {
        const id = store.activeId();
        if (id) store.saveState(id, state);
        refreshLabel();
      },
      onContentTabShown() {
        lastStackSignature = sm.getStack().map(s => s.id).join('|');
        renderContentFields();
      }
    };
  }

  const api = { create, discoverFields, selectorFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderExtras = api;
})(typeof window !== 'undefined' ? window : globalThis);
