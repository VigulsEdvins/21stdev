/**
 * Light/dark switch for the builder's own interface (not the page being built). Light (the edvlabs paper look) is the default; the choice is
 * kept in localStorage. The light look inverts the shell and turns the preview, pictures and video back, so the page
 * under construction always shows its real colours.
 */
(function () {
  'use strict';

  const KEY = 'web_builder_ui_theme';

  function read() {
    try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch (_) { return 'light'; }
  }

  function apply(mode, doc = document) {
    doc.documentElement.setAttribute('data-ui-theme', mode);
    doc.documentElement.style.colorScheme = mode;
    const btn = doc.getElementById('uiThemeBtn');
    const label = doc.getElementById('uiThemeLabel');
    if (btn) btn.setAttribute('aria-pressed', String(mode === 'light'));
    if (label) label.textContent = mode === 'light' ? 'Dark UI' : 'Light UI';
  }

  function init(doc = document) {
    apply(read(), doc);
    const btn = doc.getElementById('uiThemeBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = doc.documentElement.getAttribute('data-ui-theme') === 'light' ? 'dark' : 'light';
      apply(next, doc);
      try { localStorage.setItem(KEY, next); } catch (_) { /* choice lasts until reload */ }
    });
  }

  const api = { init, apply, read, KEY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderUITheme = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(document)); else init(document);
  }
})();
