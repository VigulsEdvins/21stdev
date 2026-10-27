/**
 * Page tabs for multi-page sites (above the sections list): add, switch, rename, duplicate and delete pages, and
 * copy the header and footer of the open page to all other pages. A project with one page shows only "Add page".
 *   BuilderPageTabs.init({ stackManager, featuresMap, showToast })
 */
(function () {
  'use strict';

  /** Applies the open page's first header and last footer to every other page (replacing theirs). Pure; returns the new pages array. */
  function applySharedChrome(pages, activeId, categoryOf) {
    const active = pages.find(p => p.id === activeId);
    if (!active) return pages;
    const header = active.stack.find(s => categoryOf(s) === 'Headers & Nav');
    const footer = [...active.stack].reverse().find(s => categoryOf(s) === 'Footers & Endings');
    const fresh = (s) => ({ ...JSON.parse(JSON.stringify(s)), id: 'sec-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4) });
    return pages.map(p => {
      if (p.id === activeId) return p;
      let stack = p.stack.slice();
      if (header) {
        const at = stack.findIndex(s => categoryOf(s) === 'Headers & Nav');
        if (at >= 0) stack[at] = fresh(header); else stack.unshift(fresh(header));
      }
      if (footer) {
        let at = -1;
        stack.forEach((s, i) => { if (categoryOf(s) === 'Footers & Endings') at = i; });
        if (at >= 0) stack[at] = fresh(footer); else stack.push(fresh(footer));
      }
      return { ...p, stack };
    });
  }

  function init({ stackManager: sm, featuresMap, showToast = () => {}, doc = document, win = window }) {
    const host = doc.getElementById('pageTabs');
    if (!host) return null;
    const categoryOf = (s) => s.category || (featuresMap && featuresMap.get(s.slug) && featuresMap.get(s.slug).category) || '';

    function button(label, className, onClick, attrs = {}) {
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = className;
      b.textContent = label;
      Object.entries(attrs).forEach(([k, v]) => { if (v !== null && v !== undefined) b.setAttribute(k, v); });
      b.addEventListener('click', onClick);
      return b;
    }

    function render() {
      const pages = sm.getPages();
      const active = sm.getActivePageId();
      host.textContent = '';
      if (!pages.length) {
        host.appendChild(button('+ Add page', 'builder-btn-subtle page-add', add, { title: 'Turn this into a multi-page site: the current sections become the Home page' }));
        return;
      }
      const list = doc.createElement('div');
      list.className = 'page-tab-list';
      list.setAttribute('role', 'tablist');
      list.setAttribute('aria-label', 'Pages');
      pages.forEach(p => {
        const isActive = p.id === active;
        const tab = button(p.title, 'page-tab' + (isActive ? ' is-active' : ''), () => sm.switchPage(p.id), { role: 'tab', 'aria-selected': String(isActive), title: `${p.slug === 'index' ? 'index' : p.slug}.html` });
        if (!isActive) tab.tabIndex = -1;
        tab.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          const i = pages.findIndex(x => x.id === p.id) + (e.key === 'ArrowRight' ? 1 : -1);
          const next = pages[(i + pages.length) % pages.length];
          sm.switchPage(next.id);
          setTimeout(() => { const t = host.querySelector('.page-tab.is-active'); if (t) t.focus(); }, 0);
        });
        list.appendChild(tab);
      });
      host.appendChild(list);
      const actions = doc.createElement('div');
      actions.className = 'page-actions';
      actions.append(
        button('+ Page', 'builder-btn-subtle', add),
        button('Rename', 'builder-btn-subtle', rename),
        button('Duplicate', 'builder-btn-subtle', () => { sm.duplicatePage(active); showToast('Duplicated the page'); }),
        button('Header & footer to all', 'builder-btn-subtle', shareChrome, { title: 'Copy this page\'s header and footer to every other page' }),
        button('Delete', 'builder-btn-subtle page-delete', remove, { disabled: pages.length <= 1 ? 'true' : null })
      );
      const current = pages.find(p => p.id === active);
      const langLabel = doc.createElement('label');
      langLabel.className = 'page-lang';
      langLabel.textContent = 'Language of this page ';
      const langInput = doc.createElement('input');
      langInput.type = 'text';
      langInput.id = 'pageOwnLangInput';
      langInput.maxLength = 12;
      langInput.autocomplete = 'off';
      langInput.value = (current && current.lang) || '';
      langInput.placeholder = (sm.getState().page.lang || 'en') + ' (site)';
      langInput.title = 'Language code for this page only, e.g. de or pt-BR. Empty uses the site language from Page Settings.';
      langInput.addEventListener('change', () => {
        const v = langInput.value.trim();
        if (v && !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(v)) { showToast('Use a language code like en, de or pt-BR.', 4000); langInput.value = (current && current.lang) || ''; return; }
        sm.setPageMeta(active, { lang: v });
      });
      langLabel.appendChild(langInput);
      actions.appendChild(langLabel);
      host.appendChild(actions);
    }

    function add() {
      const name = win.prompt('Name of the new page', 'About');
      if (!name || !name.trim()) return;
      sm.addPage(name.trim());
      showToast(`Added page "${name.trim()}"`);
    }
    function rename() {
      const current = sm.getPages().find(p => p.id === sm.getActivePageId());
      const name = win.prompt('New name for this page', current ? current.title : '');
      if (name && name.trim()) sm.renamePage(sm.getActivePageId(), name.trim());
    }
    function remove() {
      const current = sm.getPages().find(p => p.id === sm.getActivePageId());
      if (!current || !win.confirm(`Delete the page "${current.title}" and its sections? Undo can bring it back.`)) return;
      sm.removePage(current.id);
    }
    function shareChrome() {
      const pages = sm.getPages();
      const updated = applySharedChrome(pages, sm.getActivePageId(), categoryOf);
      sm.setPages(updated, sm.getActivePageId());
      showToast('Copied the header and footer to the other pages');
    }

    sm.subscribe(render);
    render();
    return { render };
  }

  const api = { init, applySharedChrome };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderPageTabs = api;
})();
