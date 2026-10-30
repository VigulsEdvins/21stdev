/**
 * CMS page runtime. Ships with every exported page next to cms-content.js.
 *
 * - Applies the content the owner published in admin.html on top of the edits made in the builder.
 *   Published content comes from the newer of: cms-content.js (uploaded with the site) and this browser's copy.
 * - In the admin preview (?cms-preview=1) it also shows draft changes live, outlines editable elements and tells
 *   the admin which field was clicked.
 */
(function () {
  'use strict';
  // the admin and its preview are the same site; a page with an opaque origin (file://, sandbox) cannot name it, so only there any origin is accepted
  var TARGET = location.origin && location.origin !== 'null' ? location.origin : '*'; // postmessage-ok: an opaque origin (file://, sandbox) cannot be named
  var C = window.EDV_CMS;
  if (!C || !Array.isArray(C.pages) || !window.__setOverrides) return;

  // The builder's "preview the editor" runs the page in a frame without files: it says which page it is and keeps nothing in storage
  var cfg = window.__EDV_CMS_FRAME || {};
  var file = cfg.file || (location.pathname.split('/').pop() || 'index.html');
  var page = null;
  C.pages.forEach(function (p) { if (p.file === file) page = p; });
  if (!page) return;

  var preview = !!cfg.file || /[?&]cms-preview=1(&|$)/.test(location.search);
  var siteKey = 'edv-cms:' + location.pathname.replace(/[^/]*$/, '');
  var base = typeof window.__getOverrides === 'function' ? window.__getOverrides() : [];

  function read(kind) {
    if (cfg.file) return null;
    try { return JSON.parse(localStorage.getItem(siteKey + ':' + kind) || 'null'); } catch (e) { return null; }
  }

  /** Addresses that may be written into href / src. Anything else (javascript:, vbscript:, ...) is dropped. */
  function safeUrl(value, type) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return '';
    if (/^(https?:|mailto:|tel:|#|\/|\.{1,2}\/)/i.test(v)) return v;
    if (type === 'image' && /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(v)) return v;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) return v; // relative path such as assets/photo.jpg or about.html
    return '';
  }

  function listFor(values) {
    var out = [];
    var mine = (values && values[file]) || {};
    page.sections.forEach(function (sec) {
      var vals = mine[sec.id];
      if (!vals) return;
      sec.fields.forEach(function (f) {
        var fv = vals[f.id + '__fit'];
        if (f.type === 'image' && f.fit && typeof fv === 'string' && fv !== f.fit && /^(cover|contain)[|0-9]{0,16}$/.test(fv)) {
          out.push({ section: sec.id, field: f.id + '__fit', selector: f.selector, type: 'fit', attr: '', value: fv });
        }
        if (vals[f.id + '__hide'] === '1') out.push({ section: sec.id, field: f.id + '__hide', selector: f.selector, type: 'hide', attr: '', value: '1' });
        var mv = vals[f.id + '__move'];
        if (typeof mv === 'string' && /^-?[1-9][0-9]?$/.test(mv)) out.push({ section: sec.id, field: f.id + '__move', selector: f.selector, type: 'move', attr: '', value: mv });
        if (!Object.prototype.hasOwnProperty.call(vals, f.id)) return;
        var v = vals[f.id];
        if (typeof v !== 'string' || v === f.value) return;
        if (f.type === 'image' || f.type === 'link') { v = safeUrl(v, f.type); if (!v) return; }
        out.push({ section: sec.id, field: f.id, selector: f.selector, type: f.type, attr: f.attr || '', value: v });
      });
    });
    return out;
  }

  function apply(values) {
    window.__setOverrides(base.concat(listFor(values)));
  }

  function published() {
    var local = read('published');
    var fromFile = { savedAt: C.updatedAt || 0, values: C.published || {} };
    if (local && local.values && (local.savedAt || 0) > (fromFile.savedAt || 0)) return local.values;
    return fromFile.values;
  }

  apply(preview ? (read('draft') && read('draft').values) || published() : published());
  // Where form messages go, if the owner changed it in the editor: the form script re-checks it before using it
  var chosen = published().__form;
  if (!preview && chosen && typeof chosen === 'object') window.__edvForm = { method: String(chosen.method || ''), target: String(chosen.target || '') };
  // Languages the owner turned off in the editor leave the language switcher; with one left the switcher goes
  var offered = published().__langs;
  if (!preview && Array.isArray(offered) && offered.length) {
    var trim = function () {
      Array.prototype.forEach.call(document.querySelectorAll('.lsw-menu'), function (menu) {
        var opts = Array.prototype.slice.call(menu.querySelectorAll('[data-lang]'));
        opts.forEach(function (o) { if (offered.indexOf(o.getAttribute('data-lang')) < 0 && o.getAttribute('aria-selected') !== 'true') o.remove(); });
        var left = menu.querySelectorAll('[data-lang]');
        var box = menu.closest('.lsw-lang');
        if (box && left.length < 2) box.style.display = 'none';
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', trim); else trim();
  }
  if (!preview) return;

  /* ---------------- admin preview only ---------------- */
  var fromAdmin = window.parent !== window ? window.parent : null;
  if (!fromAdmin) return;

  window.addEventListener('message', function (e) {
    if (e.source !== fromAdmin || !e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'edv-cms:values') apply(e.data.values || {});
    if (e.data.type === 'edv-cms:focus') focusTarget(e.data.section, e.data.field);
  });

  var style = document.createElement('style');
  style.textContent = '.edv-cms-hover{outline:2px dashed #00b181!important;outline-offset:2px;cursor:pointer!important}' +
    '.edv-cms-flash{outline:3px solid #e6c82a!important;outline-offset:3px;transition:outline-color .4s}';
  document.head.appendChild(style);

  function resolve(sec, f) {
    var root = document.getElementById(sec.id);
    if (!root) return null;
    try { return root.querySelector(f.selector); } catch (e) { return null; }
  }

  function flash(el) {
    el.classList.add('edv-cms-flash');
    setTimeout(function () { el.classList.remove('edv-cms-flash'); }, 1400);
  }

  function focusTarget(secId, fieldId) {
    var root = document.getElementById(secId);
    if (!root) return;
    var el = null;
    page.sections.forEach(function (sec) {
      if (sec.id !== secId || !fieldId) return;
      sec.fields.forEach(function (f) { if (f.id === fieldId) el = resolve(sec, f); });
    });
    var target = el || root;
    target.scrollIntoView({ behavior: 'smooth', block: el ? 'center' : 'start' });
    flash(target);
  }

  function fieldAt(node) {
    // a displayed value that is computed from an editable one (a price) names that one: data-cms-edit=".selector" next to it
    var proxy = node.closest && node.closest('[data-cms-edit]');
    var shown = null;
    if (proxy && proxy.parentElement) {
      var real = null;
      try { real = proxy.parentElement.querySelector(proxy.getAttribute('data-cms-edit')); } catch (e) { real = null; }
      if (real) { shown = proxy; node = real; }
    }
    var best = null;
    page.sections.forEach(function (sec) {
      sec.fields.forEach(function (f) {
        var el = resolve(sec, f);
        if (el && (el === node || el.contains(node)) && (!best || best.el.contains(el))) best = { sec: sec, f: f, el: el, show: shown || el };
      });
    });
    return best;
  }

  var hovered = null;
  document.addEventListener('mouseover', function (e) {
    var hit = fieldAt(e.target);
    if (hovered) hovered.classList.remove('edv-cms-hover');
    hovered = hit ? hit.show : null;
    if (hovered) hovered.classList.add('edv-cms-hover');
  });
  // capture phase: a click in the preview picks a field instead of following links or running section scripts
  document.addEventListener('click', function (e) {
    var hit = fieldAt(e.target);
    if (!hit) {
      var sec = e.target.closest && e.target.closest('.page-section');
      if (sec) fromAdmin.postMessage({ type: 'edv-cms:pick', page: file, section: sec.id }, TARGET);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    fromAdmin.postMessage({ type: 'edv-cms:pick', page: file, section: hit.sec.id, field: hit.f.id }, TARGET);
  }, true);

  fromAdmin.postMessage({ type: 'edv-cms:ready', page: file }, TARGET);
  // the admin shows each picture in a frame of the same shape; it needs the sizes of the real frames
  function reportFrames() {
    var sizes = {};
    page.sections.forEach(function (sec) {
      sec.fields.forEach(function (f) {
        if (f.type !== 'image') return;
        var node = resolve(sec, f);
        if (!node) return;
        var w = node.offsetWidth || (node.getBoundingClientRect && node.getBoundingClientRect().width) || 0;
        var h = node.offsetHeight || (node.getBoundingClientRect && node.getBoundingClientRect().height) || 0;
        if (w > 0 && h > 0) sizes[sec.id + '/' + f.id] = [Math.round(w), Math.round(h)];
      });
    });
    fromAdmin.postMessage({ type: 'edv-cms:frames', page: file, sizes: sizes }, TARGET);
  }
  setTimeout(reportFrames, 600);
  setTimeout(reportFrames, 2000);
})();
