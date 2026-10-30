/**
 * The language button every header can carry. A header's markup holds an empty slot, `<div data-edv-lang></div>`; this file turns it into
 * the button (a globe, the language code and a menu) or removes it, and holds the CSS and JS the button needs, written once for all headers.
 * The button uses the class names of the "Language Switcher Header" block (lsw-lang, lsw-menu, lsw-code), so wireLanguageSwitcher
 * (single-pages.js), the editor's language trimming (cms.js) and the builder's `__edvLangs` host treat both the same way.
 */
(function () {
'use strict';

const SLOT = /<div data-edv-lang><\/div>/g;
const BUTTON = '<div class="lsw-lang" data-edv-lang="on" hidden>'
  + '<button type="button" class="lsw-current" aria-haspopup="listbox" aria-expanded="false" aria-label="Language">'
  + '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>'
  + '<span class="lsw-code" data-cms-skip>EN</span>'
  + '<svg class="lsw-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  + '</button>'
  + '<ul class="lsw-menu" data-cms-skip role="listbox" aria-label="Choose language" hidden></ul>'
  + '</div>';

/** True when the markup has a slot or a button. */
const hasLangSlot = (html) => /data-edv-lang="on"/.test(String(html));

/** Turns every slot into the (hidden) button, or removes it when the page has one language. */
const fillLangSlots = (html, keep) => String(html).replace(SLOT, keep ? BUTTON : '');

const LANG_CSS = `[data-edv-lang] { position: relative; z-index: 60; flex: none; font-family: var(--font-body, inherit); font-size: 1rem; letter-spacing: normal; text-transform: none; line-height: 1.2; }
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

const api = { fillLangSlots, hasLangSlot, LANG_CSS, LANG_JS };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmLangSlot = api;
})();
