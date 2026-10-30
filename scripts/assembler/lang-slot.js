/**
 * The buttons every header can carry. A header's markup holds an empty slot, `<div data-edv-lang></div>`; this file turns it into a small
 * container with the visitor's dark/light button and, when the project has 2+ languages, the language button (a globe, the language code
 * and a menu), and holds the CSS and JS they need, written once for all headers.
 * The language button uses the class names of the "Language Switcher Header" block (lsw-lang, lsw-menu, lsw-code), so wireLanguageSwitcher
 * (single-pages.js), the editor's language trimming (cms.js) and the builder's `__edvLangs` host treat both the same way.
 */
(function () {
'use strict';

const SLOT = /<div data-edv-lang><\/div>/g;
const LANG_BUTTON = '<div class="lsw-lang" data-edv-lang="on" hidden>'
  + '<button type="button" class="lsw-current" aria-haspopup="listbox" aria-expanded="false" aria-label="Language">'
  + '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>'
  + '<span class="lsw-code" data-cms-skip>EN</span>'
  + '<svg class="lsw-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  + '</button>'
  + '<ul class="lsw-menu" data-cms-skip role="listbox" aria-label="Choose language" hidden></ul>'
  + '</div>';
const MODE_BUTTON = '<button type="button" class="edv-mode" data-cms-skip aria-label="Switch to dark mode" aria-pressed="false">'
  + '<svg class="edv-mode-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
  + '<svg class="edv-mode-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  + '</button>';

/** True when the markup has the buttons' container / the dark/light button. */
const hasLangSlot = (html) => /data-edv-lang="tools"/.test(String(html));
const hasModeButton = (html) => /class="edv-mode"/.test(String(html));

/** Turns every slot into the container: the dark/light button (unless switched off) and, when the page has translations, the (hidden) language button; with neither the slot just goes. */
const fillLangSlots = (html, withLang, withMode = true) => String(html).replace(SLOT, () => (withLang || withMode ? `<div class="edv-tools" data-edv-lang="tools">${withMode ? MODE_BUTTON : ''}${withLang ? LANG_BUTTON : ''}</div>` : ''));

const LANG_CSS = `.edv-tools { display: inline-flex; align-items: center; gap: 8px; }
[data-edv-lang] { position: relative; z-index: 60; flex: none; font-family: var(--font-body, inherit); font-size: 1rem; letter-spacing: normal; text-transform: none; line-height: 1.2; }
[data-edv-lang][hidden] { display: none !important; }
[data-edv-lang] .lsw-current { display: inline-flex; align-items: center; gap: 8px; font: inherit; font-size: .85rem; font-weight: 600; letter-spacing: .06em; color: inherit; padding: 8px 12px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--text, #f3f4f6) 22%, transparent); background: transparent; cursor: pointer; }
[data-edv-lang] .lsw-current svg { width: 16px; height: 16px; }
[data-edv-lang] .lsw-current .lsw-caret { width: 10px; height: 10px; transition: transform .2s; }
[data-edv-lang] .lsw-current[aria-expanded="true"] .lsw-caret { transform: rotate(180deg); }
[data-edv-lang] .lsw-menu { position: absolute; right: 0; top: calc(100% + 8px); min-width: 160px; margin: 0; list-style: none; padding: 6px; border-radius: var(--radius, 14px); background: color-mix(in srgb, var(--bg, #0b0c10) 90%, var(--text, #f3f4f6) 10%); color: var(--text, #f3f4f6); border: 1px solid color-mix(in srgb, var(--text, #f3f4f6) 14%, transparent); box-shadow: 0 20px 48px rgba(0, 0, 0, .4); }
[data-edv-lang] .lsw-menu[hidden] { display: none; }
[data-edv-lang] .lsw-menu li { padding: 10px 12px; border-radius: 9px; font-size: .92rem; font-weight: 400; letter-spacing: normal; cursor: pointer; }
[data-edv-lang] .lsw-menu li:hover, [data-edv-lang] .lsw-menu li:focus { background: color-mix(in srgb, var(--text, #f3f4f6) 12%, transparent); outline: none; }
[data-edv-lang] .lsw-menu li[aria-selected="true"] { color: var(--accent, #7c8cff); font-weight: 600; }
[data-edv-lang] .lsw-current:focus-visible, [data-edv-lang] .lsw-menu li:focus-visible { outline: 2px solid var(--accent, #7c8cff); outline-offset: 2px; }
[data-edv-lang] .edv-mode { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; padding: 0; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--text, #f3f4f6) 22%, transparent); background: transparent; color: inherit; cursor: pointer; }
[data-edv-lang] .edv-mode svg { width: 18px; height: 18px; }
[data-edv-lang] .edv-mode:focus-visible { outline: 2px solid var(--accent, #7c8cff); outline-offset: 2px; }
html[data-theme="dark"] .edv-mode .edv-mode-moon, html:not([data-theme="dark"]) .edv-mode .edv-mode-sun { display: none; }
@media (max-width: 480px) { .edv-tools { gap: 6px; } [data-edv-lang] .edv-mode { width: 34px; height: 34px; } [data-edv-lang] .lsw-current { gap: 5px; padding: 8px 10px; } [data-edv-lang] .lsw-current > svg:first-child { display: none; } }
@media (prefers-reduced-motion: reduce) { [data-edv-lang] .lsw-current .lsw-caret { transition: none; } }`;

// Opens and closes the menu. In the builder's preview the menu lists the project's languages and opens the page of the one chosen;
// in an exported page the options already carry the file to open (wireLanguageSwitcher) and its own script follows them.
const LANG_JS = `(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.lsw-lang[data-edv-lang]'), function (root) {
    if (root.getAttribute('data-lsw-ready')) return;
    root.setAttribute('data-lsw-ready', '1');
    var btn = root.querySelector('.lsw-current'), menu = root.querySelector('.lsw-menu'), code = root.querySelector('.lsw-code');
    var host = null, mine = [];
    try { host = window.parent !== window && window.parent.__edvLangs || null; mine = host ? host.list() : []; } catch (e) { host = null; mine = []; }
    // in the builder the button shows only while the project has two or more languages (it comes and goes as they are added and removed)
    if (host && mine.length > 1) {
      menu.textContent = '';
      mine.forEach(function (l) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option'); li.setAttribute('tabindex', '-1'); li.setAttribute('data-lang', l.code);
        li.setAttribute('aria-selected', String(!!l.here)); li.textContent = l.name;
        menu.appendChild(li);
        if (l.here) code.textContent = l.code.split('-')[0].toUpperCase();
      });
      root.hidden = false;
    } else host = null;
    var opts = Array.prototype.slice.call(menu.querySelectorAll('[role=option]'));
    function setOpen(open, focusFirst) {
      btn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      if (open) { menu.style.left = ''; menu.style.right = ''; if (menu.getBoundingClientRect().left < 8) { menu.style.left = '0'; menu.style.right = 'auto'; } } // a button on the left opens its menu to the right
      if (open && focusFirst) (opts.filter(function (o) { return o.getAttribute('aria-selected') === 'true'; })[0] || opts[0]).focus();
    }
    btn.addEventListener('click', function () { setOpen(menu.hidden, true); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true, true); } });
    opts.forEach(function (o, i) {
      o.addEventListener('click', function () { if (host && o.getAttribute('data-lang')) host.open(o.getAttribute('data-lang')); setOpen(false); btn.focus(); });
      o.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.click(); }
        else if (e.key === 'Escape') { setOpen(false); btn.focus(); }
        else if (e.key === 'Tab') setOpen(false);
      });
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!root.contains(e.target)) setOpen(false); });
  });
})();`;

// The visitor's dark/light button: flips <html data-mode="alt"> (the styles of the other look), the data-theme of the page, its sections and
// nested components, and the .dark class of sections, the same way applyThemeToDocument does. The choice is kept in localStorage (not inside the builder).
const MODE_JS = `(function () {
  var html = document.documentElement, base = html.getAttribute('data-theme') === 'light' ? 'light' : 'dark', cur = base;
  var KEY = 'edv-mode', inBuilder = false;
  try { inBuilder = window.parent !== window && !!window.parent.__edvLangs; } catch (e) { inBuilder = false; }
  function apply(pol) {
    cur = pol;
    if (pol === base) html.removeAttribute('data-mode'); else html.setAttribute('data-mode', 'alt');
    html.setAttribute('data-theme', pol);
    if (document.body) document.body.setAttribute('data-theme', pol);
    function nativeEl(el) { var h = el && el.closest ? el.closest('.page-section[data-native-for]') : null; return !!h && (h.getAttribute('data-native-for') || '').split(' ').indexOf(pol) >= 0; }
    var flip = pol === 'dark' ? 'light' : 'dark';
    Array.prototype.forEach.call(document.querySelectorAll('.page-section:not(.is-preloader)'), function (s) {
      var v = nativeEl(s) ? flip : pol;
      s.setAttribute('data-theme', v); s.classList.toggle('dark', v === 'dark');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme]:not(html):not(body):not(.page-section)'), function (el) { el.setAttribute('data-theme', nativeEl(el) ? flip : pol); });
    Array.prototype.forEach.call(document.querySelectorAll('.edv-mode'), function (b) {
      b.setAttribute('aria-pressed', String(pol === 'dark'));
      b.setAttribute('aria-label', pol === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
    try { window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark: pol === 'dark' } })); } catch (e) { /* older browser */ }
  }
  function start() {
    var saved = null;
    if (!inBuilder) { try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; } }
    if ((saved === 'light' || saved === 'dark') && saved !== base) apply(saved); // the default look needs no change to the page
    Array.prototype.forEach.call(document.querySelectorAll('.edv-mode'), function (b) {
      b.setAttribute('aria-pressed', String(cur === 'dark')); b.setAttribute('aria-label', cur === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      b.addEventListener('click', function () {
        var next = cur === 'dark' ? 'light' : 'dark';
        apply(next);
        if (!inBuilder) { try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked: the choice lasts for this visit */ } }
      });
    });
  }
  window.__edvMode = { reset: function () { if (cur !== base) apply(base); try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } } };
  start();
})();`;

const api = { fillLangSlots, hasLangSlot, hasModeButton, LANG_CSS, LANG_JS, MODE_JS };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmLangSlot = api;
})();
