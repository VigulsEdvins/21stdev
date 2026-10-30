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

  var lastValues = {};
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
        var sh = vals[f.id + '__shift'];
        if (typeof sh === 'string' && /^-?\d{1,3}(\.\d)?\|-?\d{1,3}(\.\d)?$/.test(sh)) out.push({ section: sec.id, field: f.id + '__shift', selector: f.selector, type: 'shift', attr: '', value: sh });
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
    lastValues = values || {};
    found = null;
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

  // Selectors such as "the 2nd div" are written for the page's own order. Once a text has been moved they would point
  // at something else, so every field is found with the moved elements back in place, once per change.
  var found = null, foundAt = 0;
  function findAll() {
    var map = {};
    page.sections.forEach(function (sec) {
      var root = document.getElementById(sec.id);
      sec.fields.forEach(function (f) {
        try { map[sec.id + '/' + f.id] = root ? root.querySelector(f.selector) : null; } catch (e) { map[sec.id + '/' + f.id] = null; }
      });
    });
    return map;
  }
  function resolve(sec, f) {
    // a block that draws itself later may not have its fields yet: look again, but not on every mouse move
    if (!found || (Date.now() - foundAt > 1500 && Object.keys(found).some(function (k) { return !found[k] || !found[k].isConnected; }))) {
      found = typeof window.__withOriginalOrder === 'function' ? window.__withOriginalOrder(findAll) : findAll();
      foundAt = Date.now();
    }
    return found[sec.id + '/' + f.id] || null;
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
  var dragged = false;
  document.addEventListener('click', function (e) {
    if (dragged) { e.preventDefault(); e.stopPropagation(); return; } // the mouse button was let go after a drag, not a click
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

  /* Drag a text to another place among its neighbours: the admin keeps the result as the field's "move" setting. */
  var drop = document.createElement('div');
  drop.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border-top:3px solid #00b181;display:none';
  document.body.appendChild(drop);
  function row(el) {
    return Array.prototype.filter.call(el.parentNode.children, function (c) { return !/^(SCRIPT|STYLE)$/.test(c.tagName) && c !== drop; });
  }
  // The neighbour under the pointer, or the nearest one.
  function neighbourAt(items, x, y) {
    var best = null, bestD = Infinity;
    items.forEach(function (n) {
      var r = n.getBoundingClientRect();
      var dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0, dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  }
  // Drag a text anywhere inside its block (Shift: drop it before or after a neighbour instead).
  // The place is sent as "x|y", a percent of the block's width, counted from where the page puts it.
  function dragFree(e, hit) {
    var root = document.getElementById(hit.sec.id), el = hit.el;
    if (!root) return;
    var rw = root.getBoundingClientRect().width || 1;
    var mine = ((lastValues[file] || {})[hit.sec.id] || {})[hit.f.id + '__shift'];
    var m = /^(-?[0-9.]+)\|(-?[0-9.]+)$/.exec(typeof mine === 'string' ? mine : '0|0') || [0, 0, 0];
    var base = { x: Number(m[1]) * rw / 100, y: Number(m[2]) * rw / 100 };
    var start = { x: e.clientX, y: e.clientY }, r0 = el.getBoundingClientRect(), rr = root.getBoundingClientRect();
    var lo = { x: Math.min(0, rr.left - r0.left), y: Math.min(0, rr.top - r0.top) }, hi = { x: Math.max(0, rr.right - r0.right), y: Math.max(0, rr.bottom - r0.bottom) };
    var saved = el.style.getPropertyValue('translate'), savedOutline = root.style.outline, on = false, d = { x: 0, y: 0 };
    function move(ev) {
      if (!on && Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) < 8) return;
      if (!on) { on = true; root.style.outline = '2px dashed #00b181'; root.style.outlineOffset = '-2px'; document.documentElement.style.userSelect = 'none'; }
      d.x = Math.max(lo.x, Math.min(hi.x, ev.clientX - start.x));
      d.y = Math.max(lo.y, Math.min(hi.y, ev.clientY - start.y));
      el.style.setProperty('translate', (base.x + d.x) + 'px ' + (base.y + d.y) + 'px');
      document.documentElement.style.cursor = 'grabbing';
      ev.preventDefault();
    }
    function up() {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
      document.documentElement.style.cursor = '';
      document.documentElement.style.userSelect = '';
      root.style.outline = savedOutline; root.style.outlineOffset = '';
      if (!on) return;
      // give the element back to the page's own settings; the admin sends the new place back as a value
      if (saved) el.style.setProperty('translate', saved); else el.style.removeProperty('translate');
      dragged = true;
      setTimeout(function () { dragged = false; }, 0);
      var pc = function (px) { return Math.round(px / rw * 1000) / 10; };
      var x = pc(base.x + d.x), y = pc(base.y + d.y);
      fromAdmin.postMessage({ type: 'edv-cms:shift', page: file, section: hit.sec.id, field: hit.f.id, value: x + '|' + y }, TARGET);
    }
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
  }
  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    var hit = fieldAt(e.target);
    if (!hit || !hit.el.parentNode) return;
    if (!e.shiftKey) { dragFree(e, hit); return; }
    if (row(hit.el).length < 2 || !(hit.f.sibs > 1)) return;
    var from = { x: e.clientX, y: e.clientY }, on = false, target = null;
    function move(ev) {
      if (!on && Math.abs(ev.clientX - from.x) + Math.abs(ev.clientY - from.y) < 8) return;
      on = true;
      var items = row(hit.el);
      target = neighbourAt(items, ev.clientX, ev.clientY);
      var r = target.getBoundingClientRect();
      var after = items.indexOf(target) > items.indexOf(hit.el);
      drop.style.display = target === hit.el ? 'none' : 'block';
      drop.style.left = r.left + 'px'; drop.style.width = r.width + 'px'; drop.style.top = (after ? r.bottom : r.top) + 'px';
      document.documentElement.style.cursor = 'grabbing';
      document.documentElement.style.userSelect = 'none';
      ev.preventDefault();
    }
    function up() {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
      drop.style.display = 'none';
      document.documentElement.style.cursor = '';
      document.documentElement.style.userSelect = '';
      if (!on) return;
      dragged = true;
      setTimeout(function () { dragged = false; }, 0);
      var items = row(hit.el), steps = target ? items.indexOf(target) - items.indexOf(hit.el) : 0;
      if (steps) fromAdmin.postMessage({ type: 'edv-cms:move', page: file, section: hit.sec.id, field: hit.f.id, steps: steps }, TARGET);
    }
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
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
