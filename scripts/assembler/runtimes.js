/**
 * Browser-side scripts the assembler puts into pages as text: lazy start for heavy sections, off-screen pause, the review overlay and the content overrides.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 * The code between the braces is not indented, so the template strings in it stay byte for byte as they were.
 */
(function () {
/**
 * Runtime for sections that start late: `__lazySection(id, slug, run)` runs a section's script when the section is
 * within one screen of the viewport. Listeners for DOMContentLoaded / load that the script adds after the page has
 * loaded are called straight away, so scripts written for page load still start.
 */
const LAZY_SECTION_RUNTIME = `  // Lazy start for heavy sections
  window.__lazySection = function (id, slug, run) {
    var el = document.getElementById(id);
    var start = function () {
      var addDoc = document.addEventListener, addWin = window.addEventListener;
      var late = function (add, target) {
        return function (type, fn) {
          if ((type === 'DOMContentLoaded' || type === 'load') && document.readyState === 'complete' && typeof fn === 'function') {
            setTimeout(function () { try { fn.call(target, new Event(type)); } catch (err) { console.error(err); } }, 0);
            return;
          }
          return add.apply(this, arguments);
        };
      };
      document.addEventListener = late(addDoc, document);
      window.addEventListener = late(addWin, window);
      window.__activeSectionRegisteringId = id;
      try { run(); } catch (err) { console.error('Error executing ' + slug + ':', err); }
      finally {
        window.__activeSectionRegisteringId = null;
        document.addEventListener = addDoc;
        window.addEventListener = addWin;
      }
    };
    if (!el || !('IntersectionObserver' in window)) { start(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: '100% 0px' });
    io.observe(el);
  };`;

/**
 * Runtime shared by preview and export: WebGL canvases that are on the page but scrolled out of view skip their
 * draw calls. A page with many WebGL sections otherwise paints all of them every frame (3 fps with six on a
 * software renderer). Canvases that are hidden or have no size keep drawing, because they may be used as a texture.
 */
const OFFSCREEN_RUNTIME = `(function () {
  if (typeof IntersectionObserver === 'undefined') return;
  var visible = new WeakMap();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible.set(e.target, e.isIntersecting); });
  }, { rootMargin: '300px 0px' });
  // A section's canvas is judged by its section: a full-screen position:fixed background belongs to the section
  // it came from, so it pauses while that section is out of view.
  function skip(canvas) {
    if (!canvas || !canvas.isConnected) return false;
    var target = (canvas.closest && canvas.closest('.page-section')) || canvas;
    if (!visible.has(target)) { visible.set(target, true); io.observe(target); return false; }
    if (visible.get(target) !== false) return false;
    var r = target.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  ['WebGLRenderingContext', 'WebGL2RenderingContext'].forEach(function (name) {
    var proto = window[name] && window[name].prototype;
    if (!proto) return;
    ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements'].forEach(function (fn) {
      var orig = proto[fn];
      if (typeof orig !== 'function') return;
      proto[fn] = function () { if (skip(this.canvas)) return; return orig.apply(this, arguments); };
    });
  });
})();`;

/**
 * Review overlay for "review copies": a client opens the exported page, switches on Review, clicks anything to
 * leave a comment, and downloads the comments as a JSON file to send back. No server: comments live in the
 * browser (localStorage) until downloaded. The builder loads that file to jump to each comment.
 */
const REVIEW_RUNTIME = `(function () {
  if (window.__reviewOverlay) return;
  window.__reviewOverlay = true;
  var KEY = 'review-comments:' + location.pathname;
  var NAME_KEY = 'review-author';
  var comments = [];
  var on = false;
  var hovered = null;

  function store(read, value) {
    try { if (read) return localStorage.getItem(KEY); localStorage.setItem(KEY, value); } catch (e) { return null; }
  }
  try { comments = JSON.parse(store(true) || '[]') || []; } catch (e) { comments = []; }

  var css = document.createElement('style');
  css.textContent = '#rv-root,#rv-root *{box-sizing:border-box;font-family:system-ui,sans-serif}'
    + '#rv-root{position:absolute;left:0;top:0;width:0;height:0;z-index:2147483000}'
    + '.rv-fab{position:fixed;left:16px;bottom:16px;display:flex;gap:8px;align-items:center;padding:10px 16px;border:0;border-radius:999px;background:#111;color:#fff;font:600 14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer}'
    + '.rv-fab[aria-pressed=true]{background:#2563eb}'
    + '.rv-fab b{background:#fff;color:#111;border-radius:999px;padding:0 7px;font-size:12px}'
    + '.rv-hover{outline:2px solid #2563eb!important;outline-offset:2px;cursor:crosshair!important}'
    + '.rv-pin{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:#2563eb;color:#fff;font:700 12px system-ui;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.4);cursor:pointer;padding:0}'
    + '.rv-pop,.rv-list{position:fixed;background:#fff;color:#111;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.45);padding:14px;font-size:14px}'
    + '.rv-pop{width:300px}.rv-pop textarea,.rv-pop input{width:100%;margin:6px 0;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;color:#111;background:#fff}'
    + '.rv-pop textarea{min-height:84px;resize:vertical}'
    + '.rv-row{display:flex;gap:8px;justify-content:flex-end}.rv-btn{padding:8px 14px;border:0;border-radius:8px;background:#2563eb;color:#fff;font:600 13px system-ui;cursor:pointer}.rv-btn.rv-ghost{background:#e2e8f0;color:#111}'
    + '.rv-list{left:16px;bottom:68px;width:340px;max-height:60vh;overflow:auto}.rv-list h2{margin:0 0 8px;font-size:15px}.rv-list ol{margin:0;padding:0;list-style:none}'
    + '.rv-item{border-top:1px solid #e2e8f0;padding:8px 0;display:grid;gap:4px}.rv-item small{color:#64748b}.rv-item button{justify-self:start;border:0;background:none;color:#2563eb;font:600 12px system-ui;cursor:pointer;padding:0}'
    + '.rv-empty{color:#64748b;margin:6px 0 10px}';
  document.head.appendChild(css);

  var root = document.createElement('div');
  root.id = 'rv-root';
  document.body.appendChild(root);
  var fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'rv-fab'; fab.setAttribute('aria-pressed', 'false');
  root.appendChild(fab);
  var pins = [];
  var pop = null;
  var list = null;

  function inRoot(el) { return !!(el && el.closest && el.closest('#rv-root')); }
  function sectionOf(el) { return el && el.closest ? el.closest('.page-section') : null; }
  function pathWithin(section, el) {
    var parts = [];
    while (el && el !== section && parts.length < 10) {
      var tag = el.tagName.toLowerCase();
      var idx = 1, sib = el;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === el.tagName) idx++;
      parts.unshift(tag + ':nth-of-type(' + idx + ')');
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function findEl(c) {
    var s = document.getElementById(c.section.id);
    if (!s) return null;
    if (!c.path) return s;
    try { return s.querySelector(':scope > ' + c.path) || s; } catch (e) { return s; }
  }
  function save() { store(false, JSON.stringify(comments)); }
  function label() { fab.innerHTML = (on ? 'Reviewing' : 'Review') + ' <b>' + comments.length + '</b>'; fab.setAttribute('aria-pressed', String(on)); }

  function placePins() {
    pins.forEach(function (p) { p.remove(); });
    pins = [];
    comments.forEach(function (c, i) {
      var el = findEl(c);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rv-pin'; b.textContent = String(i + 1);
      b.title = c.comment;
      b.style.left = Math.round(r.right + window.pageXOffset - 6) + 'px';
      b.style.top = Math.round(r.top + window.pageYOffset + 6) + 'px';
      b.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); openList(); });
      root.appendChild(b);
      pins.push(b);
    });
  }
  var raf = 0;
  function schedule() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; placePins(); }); }
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, { passive: true });
  setInterval(schedule, 1500);

  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function openPop(el, x, y) {
    closePop();
    var section = sectionOf(el);
    if (!section) return;
    pop = document.createElement('div');
    pop.className = 'rv-pop';
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Add a comment');
    pop.innerHTML = '<strong>Comment</strong><textarea placeholder="What should change here?" aria-label="Comment"></textarea><input type="text" placeholder="Your name" aria-label="Your name"><div class="rv-row"><button type="button" class="rv-btn rv-ghost">Cancel</button><button type="button" class="rv-btn">Save</button></div>';
    pop.style.left = Math.max(8, Math.min(x, window.innerWidth - 316)) + 'px';
    pop.style.top = Math.max(8, Math.min(y, window.innerHeight - 250)) + 'px';
    root.appendChild(pop);
    var ta = pop.querySelector('textarea'), nm = pop.querySelector('input'), btns = pop.querySelectorAll('button');
    try { nm.value = localStorage.getItem(NAME_KEY) || ''; } catch (e) {}
    ta.focus();
    btns[0].addEventListener('click', closePop);
    btns[1].addEventListener('click', function () {
      var text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      try { localStorage.setItem(NAME_KEY, nm.value.trim()); } catch (e) {}
      comments.push({
        id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        section: { id: section.id, slug: section.getAttribute('data-section-slug') || '' },
        path: pathWithin(section, el),
        text: (el.innerText || el.alt || '').trim().slice(0, 80),
        comment: text, author: nm.value.trim(), at: new Date().toISOString()
      });
      save(); label(); closePop(); placePins();
    });
    pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closePop(); } });
  }

  function exportJson() {
    return JSON.stringify({ format: 'web-builder-review', version: 1, page: document.title, url: location.href.split('#')[0], exportedAt: new Date().toISOString(), comments: comments }, null, 2);
  }
  function exportText() {
    return document.title + ' - review comments\\n\\n' + comments.map(function (c, i) { return (i + 1) + '. [' + (c.section.slug || 'page') + '] ' + c.comment + (c.author ? ' (' + c.author + ')' : '') + (c.text ? '\\n   on: "' + c.text + '"' : ''); }).join('\\n');
  }
  function closeList() { if (list) { list.remove(); list = null; } }
  function openList() {
    closeList();
    list = document.createElement('div');
    list.className = 'rv-list';
    list.setAttribute('role', 'dialog'); list.setAttribute('aria-label', 'Comments');
    var html = '<h2>Comments (' + comments.length + ')</h2>' + (comments.length ? '<ol>' : '<p class="rv-empty">Switch on Review, then click anything on the page to comment on it.</p>');
    comments.forEach(function (c, i) {
      html += '<li class="rv-item"><span><b>' + (i + 1) + '.</b> <span data-t></span></span><small data-s></small><button type="button" data-del="' + i + '">Delete</button></li>';
    });
    html += comments.length ? '</ol>' : '';
    html += '<div class="rv-row" style="margin-top:10px"><button type="button" class="rv-btn rv-ghost" data-act="copy">Copy text</button><button type="button" class="rv-btn" data-act="download">Download comments</button></div>';
    html += '<p class="rv-note" style="margin:8px 0 0;font-size:11px;opacity:.7">Comments are saved only in this browser until you download them. Nothing is sent anywhere.</p>';
    list.innerHTML = html;
    var spans = list.querySelectorAll('[data-t]');
    var metas = list.querySelectorAll('[data-s]');
    comments.forEach(function (c, i) { spans[i].textContent = c.comment; metas[i].textContent = (c.section.slug || 'page') + (c.author ? ' \u00b7 ' + c.author : ''); });
    list.addEventListener('click', function (e) {
      var d = e.target.getAttribute && e.target.getAttribute('data-del');
      if (d !== null && d !== undefined) { comments.splice(Number(d), 1); save(); label(); placePins(); openList(); return; }
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'download') {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' }));
        a.download = 'review-comments.json'; document.body.appendChild(a); a.click(); a.remove();
      } else if (act === 'copy') {
        var text = exportText();
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
      }
    });
    list.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeList(); });
    root.appendChild(list);
  }

  function setOn(v) {
    on = v; label();
    document.body.classList.toggle('rv-on', on);
    if (!on) { if (hovered) hovered.classList.remove('rv-hover'); hovered = null; closePop(); }
  }
  fab.addEventListener('click', function () { if (list) { closeList(); } else { openList(); } });
  fab.addEventListener('dblclick', function () { setOn(!on); });
  fab.addEventListener('keydown', function (e) { if (e.key === 'r' || e.key === 'R') setOn(!on); });
  document.addEventListener('mouseover', function (e) {
    if (!on || inRoot(e.target) || !sectionOf(e.target)) return;
    if (hovered) hovered.classList.remove('rv-hover');
    hovered = e.target; hovered.classList.add('rv-hover');
  });
  document.addEventListener('click', function (e) {
    if (!on || inRoot(e.target) || !sectionOf(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    openPop(e.target, e.clientX + 12, e.clientY + 12);
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePop(); closeList(); if (on) setOn(false); } });
  label();
  // a first-time hint: the button toggles the list, and a toggle for review mode sits next to it
  var toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'rv-fab'; toggle.style.left = '130px'; toggle.textContent = 'Comment mode';
  toggle.setAttribute('aria-pressed', 'false');
  toggle.addEventListener('click', function () { setOn(!on); toggle.setAttribute('aria-pressed', String(on)); toggle.textContent = on ? 'Stop commenting' : 'Comment mode'; });
  root.appendChild(toggle);
  placePins();
})();`;

/** Runtime shared by preview and export: defines window.__setOverrides(list). */
const OVERRIDES_RUNTIME = `(function () {
  var list = [];
  // What each element held before an override touched it, so removing the override (Reset, undo) puts it back.
  var originals = [];
  function original(el) {
    for (var i = 0; i < originals.length; i++) if (originals[i].el === el) return originals[i];
    var rec = { el: el, saved: {} };
    originals.push(rec);
    return rec;
  }
  function remember(el, key, read) {
    var rec = original(el);
    if (!(key in rec.saved)) rec.saved[key] = read();
    return key;
  }
  function restore(el, key, value) {
    if (key === 'html') el.innerHTML = value;
    else if (key === 'src') { if (value === null) el.removeAttribute('src'); else el.setAttribute('src', value); }
    else if (key === 'alt' || key === 'aria-label' || key === 'role') { if (value === null) el.removeAttribute(key); else el.setAttribute(key, value); }
    else if (key === 'srcset') { if (value === null) el.removeAttribute('srcset'); else el.setAttribute('srcset', value); }
    else if (key === 'href') { if (value === null) el.removeAttribute('href'); else el.setAttribute('href', value); }
    else if (key === 'svgpic') { if (value && value.parentNode) value.parentNode.removeChild(value); el.__cmsPic = null; }
    else if (key.indexOf('style:') === 0) { if (value) el.style.setProperty(key.slice(6), value); else el.style.removeProperty(key.slice(6)); }
    else if (key === 'move') { if (value.parent && value.parent.isConnected) value.parent.insertBefore(el, value.next && value.next.parentNode === value.parent ? value.next : null); }
  }
  // The element children that count as places in a row: scripts and styles are not on the page.
  function places(parent) {
    return Array.prototype.filter.call(parent.children, function (c) { return !/^(SCRIPT|STYLE)$/.test(c.tagName); });
  }
  // Moves el by n places among its neighbours (negative = up), counting from where it was originally.
  var moves = [];
  function moveBy(el, n, active) {
    var rec = original(el);
    rec.saved.move = { parent: el.parentNode, next: el.nextSibling };
    active.push([el, 'move']);
    moves.push({ el: el, n: n });
    place(el, n);
  }
  function place(el, n) {
    var row = places(el.parentNode), at = row.indexOf(el);
    var to = Math.max(0, Math.min(row.length - 1, at + n));
    if (to === at) return;
    if (to > at) el.parentNode.insertBefore(el, row[to].nextSibling);
    else el.parentNode.insertBefore(el, row[to]);
  }
  var STYLED = /^(SPAN|B|I|EM|STRONG|SMALL|MARK|U|SUB|SUP)$/;
  // A child whose words belong to the field: a plain styled run (the gradient half of a headline), nothing inside it
  // but more of the same and line breaks. Decorative runs (an icon font glyph) are not words; links, buttons, icons
  // and pictures stay as they are too.
  function styledRun(c) {
    if (!STYLED.test(c.tagName) || c.getAttribute('aria-hidden') === 'true' || /icon|glyph/i.test(c.getAttribute('class') || '')) return false;
    for (var k = c.firstElementChild; k; k = k.nextElementSibling) if (k.tagName !== 'BR' && !styledRun(k)) return false;
    return true;
  }
  // What an element says in reading order, in lines that a <br> ends. A part is a text node we may change, or
  // { fixed: words } for an element that keeps its own words (a link): it counts as text but is never changed.
  function textLines(el, lines) {
    lines = lines || [[]];
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) lines[lines.length - 1].push(n);
      else if (n.nodeType === 1 && n.tagName === 'BR') lines.push([]);
      else if (n.nodeType === 1 && styledRun(n)) textLines(n, lines);
      else if (n.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(n.tagName)) lines[lines.length - 1].push({ fixed: n.textContent, node: n });
    }
    return lines;
  }
  function wordsOf(part) { return part.fixed !== undefined ? part.fixed : part.nodeValue; }
  // Puts newText where the old words were: what the old and new text share at the start and end stays where it was
  // (so a bold word nobody touched stays bold, a link stays), the part in between goes into the text node it starts in.
  function patchParts(parts, newText) {
    var old = parts.map(wordsOf).join('');
    if (old === newText) return;
    var p = 0, max = Math.min(old.length, newText.length);
    while (p < max && old.charAt(p) === newText.charAt(p)) p++;
    var s = 0;
    while (s < max - p && old.charAt(old.length - 1 - s) === newText.charAt(newText.length - 1 - s)) s++;
    var cutFrom = p, cutTo = old.length - s, insert = newText.slice(p, newText.length - s);
    var spans = [], at = 0;
    parts.forEach(function (t) { var w = wordsOf(t); spans.push({ t: t, from: at, to: at + w.length }); at += w.length; });
    var editable = spans.filter(function (x) { return x.t.fixed === undefined; });
    var target = null;
    // words replaced: the run the old words started in; words only added: the run they follow
    editable.forEach(function (x) { if (!target && x.from <= cutFrom && (cutFrom < x.to || (cutTo === cutFrom && cutFrom === x.to))) target = x; });
    if (!target) editable.forEach(function (x) { if (!target && x.from >= cutFrom) target = x; });
    if (!target) target = editable[editable.length - 1];
    editable.forEach(function (x) {
      var v = x.t.nodeValue, a = Math.min(Math.max(cutFrom, x.from) - x.from, v.length), b = Math.max(Math.min(cutTo, x.to) - x.from, 0);
      if (x === target) x.t.nodeValue = v.slice(0, a) + insert + v.slice(Math.max(a, b));
      else if (b > a) x.t.nodeValue = v.slice(0, a) + v.slice(b);
    });
  }
  // The line breaks and lines that an earlier edit added are ours to remove before the next edit.
  function dropMade(el) {
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.__cmsMade) el.removeChild(n);
      else if (n.nodeType === 1) dropMade(n);
    });
  }
  // Adds each line after the node "after" (or at the end of "parent" when there is none), a <br> before every one.
  function addLines(parent, after, rows) {
    var at = after ? after.nextSibling : null, box = after ? after.parentNode : parent;
    rows.forEach(function (row, i) {
      var nodes = [];
      if (after || i) nodes.push(document.createElement('br'));
      nodes.push(document.createTextNode(row));
      nodes.forEach(function (n) { n.__cmsMade = true; box.insertBefore(n, at); });
    });
  }
  // Replaces the words of an element without destroying elements inside it (a link, an icon, another editable field):
  // when it has child elements, the words in its own text and in plain styled runs (a gradient <span>) change.
  // A line break in the value goes to the next part of the text, the way the field shows it (one line per <br>).
  function setText(el, value) {
    dropMade(el);
    if (!el.children.length) {
      // no element inside: a new line in the value is a line break on the page
      var rows = String(value).split(/\\r?\\n/);
      if (rows.length === 1) { el.textContent = value; return; }
      el.textContent = '';
      addLines(el, null, rows);
      return;
    }
    // every edit starts from the words the page came with, not from the previous edit (the field is applied again
    // on each keystroke, and the changes of two edits would otherwise pile up)
    textLines(el).forEach(function (parts) {
      parts.forEach(function (t) {
        if (t.fixed !== undefined) return;
        if (t.__cmsWords === undefined) t.__cmsWords = t.nodeValue; else t.nodeValue = t.__cmsWords;
      });
    });
    // the blank source indentation at the ends of a line is not words; spaces between two parts are
    var lines = [];
    textLines(el).forEach(function (parts) {
      var from = 0, to = parts.length;
      while (from < to && !wordsOf(parts[from]).trim()) from++;
      while (to > from && !wordsOf(parts[to - 1]).trim()) to--;
      if (to > from) lines.push(parts.slice(from, to));
    });
    var editable = lines.filter(function (parts) { return parts.some(function (t) { return t.fixed === undefined; }); });
    if (!editable.length) {
      // the words live in a child (a button whose label is a <span>): change those, not add a second set next to them
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
        if (c.textContent.trim()) { setText(c, value); return; }
      }
      el.insertBefore(document.createTextNode(value), el.firstChild);
      return;
    }
    var said = String(value).split(/\\r?\\n/);
    // more lines than the heading has: each extra one becomes a new line after the last, with a line break
    var extra = said.slice(lines.length);
    lines.forEach(function (parts, i) {
      if (parts.every(function (t) { return t.fixed !== undefined; })) return;
      var text = (i < said.length ? said[i] : '').replace(/\\s+/g, ' ').trim();
      if (parts.map(wordsOf).join('').replace(/\\s+/g, ' ').trim() === text) return;
      // work on the words alone: collapse the whitespace the way the page shows it, then patch
      var first = parts[0], last = parts[parts.length - 1];
      var lead = first.fixed === undefined && /^\\s/.test(first.nodeValue), tail = last.fixed === undefined && /\\s$/.test(last.nodeValue);
      parts.forEach(function (t) { if (t.fixed === undefined) t.nodeValue = t.nodeValue.replace(/\\s+/g, ' '); });
      if (first.fixed === undefined) first.nodeValue = first.nodeValue.replace(/^ /, '');
      if (last.fixed === undefined) last.nodeValue = last.nodeValue.replace(/ $/, '');
      patchParts(parts, text);
      if (lead) first.nodeValue = ' ' + first.nodeValue;
      if (tail) last.nodeValue = last.nodeValue + ' ';
    });
    if (extra.length) {
      var end = lines[lines.length - 1];
      end = end[end.length - 1];
      addLines(null, end.fixed !== undefined ? end.node : end, extra);
    }
  }
  // A picture's fit, from "cover", "contain" or "cover|50|20|150" (mode, focus x %, focus y %, zoom %).
  // The older words top, bottom, left, right and center still work as the focus.
  function fitFor(o) {
    var parts = String(o.value || '').split('|');
    var words = { center: [50, 50], top: [50, 0], bottom: [50, 100], left: [0, 50], right: [100, 50] };
    var x = 50, y = 50, z = 100;
    if (words[parts[1]]) { x = words[parts[1]][0]; y = words[parts[1]][1]; }
    else if (parts.length > 2) {
      x = Math.max(0, Math.min(100, Number(parts[1]))); y = Math.max(0, Math.min(100, Number(parts[2]))); z = Math.max(100, Math.min(400, Number(parts[3]) || 100));
      if (x !== x) x = 50; if (y !== y) y = 50;
    }
    return { mode: parts[0] === 'contain' ? 'contain' : 'cover', x: x, y: y, z: z };
  }
  // <img> (or the photo that replaced an SVG drawing): crop or fit, move the focus, zoom
  function fitImg(img, fit, track, keys) {
    var props = { 'object-fit': fit.mode, 'object-position': fit.x + '% ' + fit.y + '%' };
    if (fit.z > 100 && fit.mode === 'cover') { props['transform'] = 'scale(' + fit.z / 100 + ')'; props['transform-origin'] = fit.x + '% ' + fit.y + '%'; props['clip-path'] = 'inset(0)'; }
    else if (track) { props['transform'] = ''; props['transform-origin'] = ''; props['clip-path'] = ''; }
    Object.keys(props).forEach(function (prop) {
      if (track) { remember(img, 'style:' + prop, function () { return img.style.getPropertyValue(prop); }); keys.push([img, 'style:' + prop]); }
      if (props[prop]) img.style.setProperty(prop, props[prop]); else img.style.removeProperty(prop);
    });
  }
  // top-level comma split of a computed background-image
  function bgLayers(value) {
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < value.length; i++) {
      var c = value.charAt(i);
      if (c === '(') depth++; else if (c === ')') depth--;
      if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.filter(function (l) { return l && l !== 'none'; });
  }
  var painted = [];
  // An element painted with a background image: set or keep its picture, keep the dark overlay a card has on top
  // of its photo, then crop or fit it, move the focus and zoom.
  function paintBg(el, url, fit, keys) {
    if (!el.__cmsBg) el.__cmsBg = bgLayers(el.ownerDocument.defaultView.getComputedStyle(el).backgroundImage || '');
    var layers = el.__cmsBg;
    var photo = url ? 'url("' + url.replace(/"/g, '%22') + '")' : layers.filter(function (l) { return l.indexOf('url(') === 0; })[0];
    if (!photo) return;
    var hasPhoto = layers.some(function (l) { return l.indexOf('url(') === 0; });
    var overlays = url && !hasPhoto ? [] : layers.filter(function (l) { return l.indexOf('url(') !== 0; });
    if (!hasPhoto) overlays = [];
    ['background-image', 'background-size', 'background-position', 'background-repeat'].forEach(function (prop) {
      remember(el, 'style:' + prop, function () { return el.style.getPropertyValue(prop); });
      keys.push([el, 'style:' + prop]);
    });
    function put(sizeText) {
      el.style.setProperty('background-image', overlays.concat(photo).join(', '));
      el.style.setProperty('background-size', overlays.map(function () { return 'auto'; }).concat(sizeText).join(', '));
      el.style.setProperty('background-position', overlays.map(function () { return '0 0'; }).concat(fit.x + '% ' + fit.y + '%').join(', '));
      el.style.setProperty('background-repeat', overlays.map(function () { return 'repeat'; }).concat('no-repeat').join(', '));
    }
    var addr = photo.slice(4, -1);
    if (addr.charAt(0) === '"' || addr.charAt(0) === "'") addr = addr.slice(1, -1);
    el.__cmsRefresh = null;
    if (fit.mode === 'contain') put('contain');
    else if (fit.z <= 100) put('cover');
    else {
      put('cover');
      var im = new Image();
      var size = function () {
        if (!im.naturalWidth) return;
        var box = el.getBoundingClientRect();
        var k = Math.max(box.width / im.naturalWidth, box.height / im.naturalHeight) * fit.z / 100;
        put(Math.round(im.naturalWidth * k) + 'px ' + Math.round(im.naturalHeight * k) + 'px');
      };
      im.onload = size;
      im.src = addr.replace(/%22/g, '"');
      if (im.complete) size();
      el.__cmsRefresh = size;
      painted.push(el);
    }
  }
  window.addEventListener('resize', function () { painted.forEach(function (el) { if (el.__cmsRefresh) el.__cmsRefresh(); }); });
  // the fit chosen for a picture field, if any
  function fitOverride(o, field) {
    var found = null;
    list.forEach(function (a) { if (a.section === o.section && a.field === field + '__fit') found = a; });
    return fitFor(found || { value: '' });
  }
  var shifted = [];
  function placeShift(s) {
    var w = s.root.getBoundingClientRect().width;
    s.el.style.setProperty('translate', (s.x * w / 100).toFixed(1) + 'px ' + (s.y * w / 100).toFixed(1) + 'px');
  }
  window.addEventListener('resize', function () { shifted.forEach(placeShift); });
  function apply() {
    var active = [];
    painted = [];
    shifted = [];
    moves = [];
    // every move counts from the page's own order: put the moved elements back (last moved first), then move them again
    for (var m = originals.length - 1; m >= 0; m--) {
      if (originals[m].saved.move) { restore(originals[m].el, 'move', originals[m].saved.move); delete originals[m].saved.move; }
    }
    // find every element first, in the page's own order: a selector such as "the 2nd div" must not see the
    // page after another field was moved
    var found = list.map(function (o) {
      var r = document.getElementById(o.section);
      try { return r ? r.querySelector(o.selector) : null; } catch (e) { return null; }
    });
    list.forEach(function (o, at) {
      var root = document.getElementById(o.section);
      if (!root) return;
      var el = found[at];
      if (!el) return;
      var key;
      if (o.type === 'image') {
        if (el.tagName === 'IMG') {
          remember(el, 'srcset', function () { return el.getAttribute('srcset'); });
          remember(el, 'src', function () { return el.getAttribute('src'); });
          active.push([el, 'srcset'], [el, 'src']);
          el.removeAttribute('srcset'); el.src = o.value;
          if (list.some(function (a) { return a.section === o.section && a.field === o.field + '__fit'; })) fitImg(el, fitOverride(o, o.field), true, active);
        } else if (el.namespaceURI === 'http://www.w3.org/2000/svg') {
          // an inline SVG drawing: hide it and show the photo in its place, at the drawing's size
          var pic = el.__cmsPic;
          if (!pic) {
            var box = el.getBoundingClientRect();
            pic = document.createElement('img');
            pic.className = 'cms-svg-pic';
            pic.style.cssText = 'display:block;width:100%;max-width:' + Math.round(box.width) + 'px;aspect-ratio:' + Math.round(box.width) + '/' + Math.round(box.height) + ';object-fit:cover;margin:0 auto';
            el.parentNode.insertBefore(pic, el.nextSibling);
            el.__cmsPic = pic;
          }
          remember(el, 'svgpic', function () { return pic; });
          key = remember(el, 'style:display', function () { return el.style.getPropertyValue('display'); });
          active.push([el, 'svgpic'], [el, key]);
          el.style.setProperty('display', 'none');
          pic.src = o.value;
          pic.alt = '';
          list.forEach(function (a) { if (a.section === o.section && a.field === o.field + '__alt') pic.alt = a.value; });
          fitImg(pic, fitOverride(o, o.field), false);
        } else {
          paintBg(el, o.value, fitOverride(o, o.field), active);
        }
      } else if (o.type === 'fit') {
        // how a picture fills its frame (see fitFor); a picture that is also replaced is painted by its image override
        var replaced = list.some(function (a) { return a.section === o.section && a.field + '__fit' === o.field && a.type === 'image'; });
        if (el.tagName === 'IMG') fitImg(el, fitFor(o), true, active);
        else if (el.namespaceURI !== 'http://www.w3.org/2000/svg' && !replaced) paintBg(el, '', fitFor(o), active);
      } else if (o.type === 'alt') {
        // the picture's description: alt on an <img>, aria-label on anything painted with a background image
        if (el.tagName === 'IMG') {
          remember(el, 'alt', function () { return el.getAttribute('alt'); });
          active.push([el, 'alt']);
          el.setAttribute('alt', o.value);
        } else {
          remember(el, 'aria-label', function () { return el.getAttribute('aria-label'); });
          remember(el, 'role', function () { return el.getAttribute('role'); });
          active.push([el, 'aria-label'], [el, 'role']);
          el.setAttribute('aria-label', o.value); el.setAttribute('role', 'img');
        }
      } else if (o.type === 'link') {
        key = remember(el, 'href', function () { return el.getAttribute('href'); });
        active.push([el, key]);
        el.setAttribute('href', o.value);
      } else if (o.type === 'hide') {
        if (String(o.value) === '1') {
          key = remember(el, 'style:display', function () { return el.style.getPropertyValue('display'); });
          active.push([el, key]);
          el.style.setProperty('display', 'none', 'important');
        }
      } else if (o.type === 'shift') {
        // placed by hand: x|y as a percent of the block's width, counted from where the page puts it
        var xy = /^(-?\\d{1,3}(?:\\.\\d)?)\\|(-?\\d{1,3}(?:\\.\\d)?)$/.exec(String(o.value));
        if (xy) {
          key = remember(el, 'style:translate', function () { return el.style.getPropertyValue('translate'); });
          active.push([el, key]);
          shifted.push({ el: el, root: root, x: Number(xy[1]), y: Number(xy[2]) });
          placeShift(shifted[shifted.length - 1]);
        }
      } else if (o.type === 'move') {
        var steps = parseInt(o.value, 10);
        if (steps && isFinite(steps) && el.parentNode) moveBy(el, Math.max(-50, Math.min(50, steps)), active);
      } else if (o.type === 'color') {
        key = remember(el, 'style:' + (o.attr || 'color'), function () { return el.style.getPropertyValue(o.attr || 'color'); });
        active.push([el, key]);
        el.style.setProperty(o.attr || 'color', o.value);
      } else {
        key = remember(el, 'html', function () { return el.innerHTML; });
        active.push([el, key]);
        setText(el, o.value);
      }
    });
    // anything an override changed earlier but no longer asks for goes back to what it was
    originals = originals.filter(function (rec) {
      Object.keys(rec.saved).forEach(function (key) {
        var still = active.some(function (a) { return a[0] === rec.el && a[1] === key; });
        if (!still) { restore(rec.el, key, rec.saved[key]); delete rec.saved[key]; }
      });
      return Object.keys(rec.saved).length > 0;
    });
  }
  // Runs fn with the page in its own order (moved elements back where they came from), then moves them again.
  window.__withOriginalOrder = function (fn) {
    for (var m = originals.length - 1; m >= 0; m--) {
      var sv = originals[m].saved.move;
      if (sv) restore(originals[m].el, 'move', sv);
    }
    try { return fn(); } finally { moves.forEach(function (mv) { place(mv.el, mv.n); }); }
  };
  window.__setOverrides = function (next) { list = next || []; apply(); };
  window.__getOverrides = function () { return list.slice(); };
  window.__applyOverrides = apply;
  document.addEventListener('DOMContentLoaded', function () { apply(); setTimeout(apply, 400); setTimeout(apply, 1500); });
  window.addEventListener('load', apply);
})();`;

const PRELOADER_DISMISS_PREVIEW = `        // Preloader Auto-Dismiss Handler
        try {
          (function() {
            function initPreloaderWatch() {
              const sec = document.querySelector('.page-section.is-preloader:not(.is-suppressed), .page-section[data-section-slug*="preloader"]:not(.is-suppressed)');
              if (!sec) return;
              function dismiss() {
                sec.classList.add('is-dismissed');
                sec.style.opacity = '0';
                sec.style.pointerEvents = 'none';
                setTimeout(() => { sec.style.display = 'none'; }, 500);
              }
              const checkDone = () => {
                const root = sec.querySelector('[data-phase="done"], [data-completed="true"], [data-state="done"]');
                const gate = sec.querySelector('.amr-gate, .scp-gate, [class*="-gate"]');
                if (root || (gate && window.getComputedStyle(gate).display === 'none')) {
                  dismiss();
                  return true;
                }
                return false;
              };
              const obs = new MutationObserver(() => {
                if (checkDone()) obs.disconnect();
              });
              obs.observe(sec, { attributes: true, subtree: true, attributeFilter: ['data-phase', 'data-completed', 'class', 'style'] });
              sec.addEventListener('click', () => { setTimeout(dismiss, 1000); });
              setTimeout(() => { if (sec.style.display !== 'none') dismiss(); }, 5000);
            }
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initPreloaderWatch);
            } else {
              initPreloaderWatch();
            }
          })();
        } catch (e) {}`;

const PRELOADER_DISMISS_EXPORT = `  // Preloader Auto-Dismiss Handler
  try {
    (function() {
      function initPreloaderWatch() {
        const sec = document.querySelector('.page-section.is-preloader, .page-section[data-section-slug*="preloader"]');
        if (!sec) return;
        function dismiss() {
          sec.classList.add('is-dismissed');
          sec.style.opacity = '0';
          sec.style.pointerEvents = 'none';
          setTimeout(() => { sec.style.display = 'none'; }, 500);
        }
        const checkDone = () => {
          const root = sec.querySelector('[data-phase="done"], [data-completed="true"], [data-state="done"]');
          const gate = sec.querySelector('.amr-gate, .scp-gate, [class*="-gate"]');
          if (root || (gate && window.getComputedStyle(gate).display === 'none')) {
            dismiss();
            return true;
          }
          return false;
        };
        const obs = new MutationObserver(() => {
          if (checkDone()) obs.disconnect();
        });
        obs.observe(sec, { attributes: true, subtree: true, attributeFilter: ['data-phase', 'data-completed', 'class', 'style'] });
        sec.addEventListener('click', () => { setTimeout(dismiss, 1000); });
        setTimeout(() => { if (sec.style.display !== 'none') dismiss(); }, 5000);
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPreloaderWatch);
      } else {
        initPreloaderWatch();
      }
    })();
  } catch (e) {}`;

/** The preview page's own script (live theme updates, wheel and media-query helpers); `isDark` is the theme's polarity. Printed before `initAllSections`. */
function previewPageScript(isDark) {
  return `    (function () {
      // Dynamic live theme updates via postMessage
      window.addEventListener('message', function (event) {
        if (event.source !== window.parent) return; // only the builder that framed this preview may restyle it
        if (event.data && event.data.type === 'UPDATE_THEME' && event.data.theme) {
          var t = event.data.theme;
          var okColour = function (v) { return typeof v === 'string' && /^(#[0-9a-fA-F]{3,8}|(rgb|hsl)a?\\([0-9\\s.,%\\/-]+\\)|[a-zA-Z]{3,20})$/.test(v.trim()) ? v.trim() : ''; };
          t = { bg: okColour(t.bg), text: okColour(t.text), accent: okColour(t.accent), cardBg: okColour(t.cardBg), border: okColour(t.border) };
          var isDark = t.bg ? (function(hex) {
            hex = String(hex).replace('#', '');
            if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
            var r = parseInt(hex.slice(0, 2), 16) || 0;
            var g = parseInt(hex.slice(2, 4), 16) || 0;
            var b = parseInt(hex.slice(4, 6), 16) || 0;
            return (r * 0.299 + g * 0.587 + b * 0.114) < 70;
          })(t.bg) : true;

          var textMuted = 'color-mix(in srgb, ' + t.text + ' 65%, transparent)';
          var cardBg = t.cardBg || (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)');
          var border = t.border || (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
          var accent = t.accent || '#6366f1';

          var vars = {
            '--preview-bg': t.bg,
            '--preview-text': t.text,
            '--preview-accent': accent,
            '--preview-card-bg': cardBg,
            '--preview-border': border,
            '--background': t.bg,
            '--foreground': t.text,
            '--bg': t.bg,
            '--text': t.text,
            '--accent': accent,
            '--card': cardBg,
            '--card-foreground': t.text,
            '--border': border,
            '--primary': accent,
            '--muted': cardBg,
            '--muted-foreground': textMuted,
            '--bg-color': t.bg,
            '--text-color': t.text,
            '--text-main': t.text,
            '--text-muted': textMuted,
            '--card-bg': cardBg,
            '--card-border': border,
            '--pl-bg': t.bg,
            '--pl-ink': t.text,
            '--pl-muted': textMuted,
            '--bwf-bg': t.bg,
            '--bwf-ink': t.text,
            '--bwf-muted': textMuted,
            '--ib-page': t.bg,
            '--ib-paper': cardBg,
            '--ib-card': cardBg,
            '--ib-ink': t.text,
            '--ib-soft': textMuted,
            '--ib-line': border,
            '--ip-page': t.bg,
            '--ip-paper': cardBg,
            '--ip-card': cardBg,
            '--ip-ink': t.text,
            '--ip-soft': textMuted,
            '--ip-line': border
          };
          for (var k in vars) {
            if (vars[k]) document.documentElement.style.setProperty(k, vars[k]);
          }
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
          document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
          if (document.body) document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
          var pagePol = isDark ? 'dark' : 'light';
          var isNativeEl = function (el) {
            var host = el.closest ? el.closest('.page-section[data-native-for]') : null;
            return !!host && (host.getAttribute('data-native-for') || '').split(' ').indexOf(pagePol) !== -1;
          };
          document.querySelectorAll('.page-section:not(.is-preloader)').forEach(function (s) {
            var native = isNativeEl(s);
            s.style.backgroundColor = native ? '' : (t.bg || '');
            s.style.color = native ? '' : (t.text || '');
            s.setAttribute('data-theme', native ? (isDark ? 'light' : 'dark') : pagePol);
            if (s.classList && typeof s.classList.toggle === 'function') s.classList.toggle('dark', (native ? (isDark ? 'light' : 'dark') : pagePol) === 'dark');
          });
          document.querySelectorAll('[data-theme]').forEach(function (el) {
            el.setAttribute('data-theme', isNativeEl(el) ? (isDark ? 'light' : 'dark') : pagePol);
          });
          try {
            window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark: isDark, theme: t } }));
          } catch (_) {}
        }
      });

      // Theme-Aware MatchMedia Polyfill for prefers-color-scheme in live preview
      (function () {
        var origMatchMedia = window.matchMedia;
        window.matchMedia = function (query) {
          if (typeof query === 'string' && query.includes('prefers-color-scheme')) {
            var checkIsDark = function () {
              var attr = document.documentElement.getAttribute('data-theme');
              if (attr) return attr === 'dark';
              var cs = document.documentElement.style.colorScheme;
              if (cs) return cs === 'dark';
              return true;
            };
            var isDarkQuery = query.includes('dark');
            var checkMatches = function () {
              return isDarkQuery ? checkIsDark() : !checkIsDark();
            };
            var listeners = [];
            var mql = {
              get matches() { return checkMatches(); },
              media: query,
              onchange: null,
              addListener: function (fn) { this.addEventListener('change', fn); },
              removeListener: function (fn) { this.removeEventListener('change', fn); },
              addEventListener: function (type, fn) {
                if (type === 'change' && typeof fn === 'function') listeners.push(fn);
              },
              removeEventListener: function (type, fn) {
                listeners = listeners.filter(function (l) { return l !== fn; });
              },
              dispatchEvent: function (e) {
                listeners.forEach(function (fn) { fn(e); });
                return true;
              }
            };
            window.addEventListener('themechange', function () {
              var e = { matches: checkMatches(), media: query };
              if (typeof mql.onchange === 'function') mql.onchange(e);
              listeners.forEach(function (fn) { fn(e); });
            });
            return mql;
          }
          return origMatchMedia ? origMatchMedia.call(window, query) : { matches: false };
        };
      })();

      // Preview is a static mock-up: links and form buttons stay clickable but never navigate the frame away
      // (a navigation replaces the preview with a blank page until the builder is reloaded).
      document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href], area[href]');
        if (!a) return;
        e.preventDefault();
        var href = a.getAttribute('href') || '';
        if (href.charAt(0) === '#' && href.length > 1) {
          try {
            var t = document.getElementById(decodeURIComponent(href.slice(1)));
            if (t) t.scrollIntoView({ behavior: 'smooth' });
          } catch (_) {}
        }
      }, true);
      document.addEventListener('submit', function (e) { e.preventDefault(); }, true);

      // Notify parent builder when a section is clicked in preview
      document.addEventListener('click', function (e) {
        var sec = e.target.closest('.page-section');
        if (sec && sec.id && window.parent) {
          window.parent.postMessage({ type: 'SECTION_CLICKED', sectionId: sec.id }, '*'); // postmessage-ok: only a section id, and the preview's origin can be opaque
        }
      });

      // Theme-Aware MatchMedia Polyfill for prefers-color-scheme
(function () {
  var origMatchMedia = window.matchMedia;
  window.matchMedia = function (query) {
    if (typeof query === 'string' && query.includes('prefers-color-scheme')) {
      var checkIsDark = function () {
        var attr = document.documentElement.getAttribute('data-theme');
        if (attr) return attr === 'dark';
        var cs = document.documentElement.style.colorScheme;
        if (cs) return cs === 'dark';
        return ${isDark ? 'true' : 'false'};
      };
      var isDarkQuery = query.includes('dark');
      var checkMatches = function () {
        return isDarkQuery ? checkIsDark() : !checkIsDark();
      };
      var listeners = [];
      var mql = {
        get matches() { return checkMatches(); },
        media: query,
        onchange: null,
        addListener: function (fn) { this.addEventListener('change', fn); },
        removeListener: function (fn) { this.removeEventListener('change', fn); },
        addEventListener: function (type, fn) {
          if (type === 'change' && typeof fn === 'function') listeners.push(fn);
        },
        removeEventListener: function (type, fn) {
          listeners = listeners.filter(function (l) { return l !== fn; });
        },
        dispatchEvent: function (e) {
          listeners.forEach(function (fn) { fn(e); });
          return true;
        }
      };
      window.addEventListener('themechange', function () {
        var e = { matches: checkMatches(), media: query };
        if (typeof mql.onchange === 'function') mql.onchange(e);
        listeners.forEach(function (fn) { fn(e); });
      });
      return mql;
    }
    return origMatchMedia ? origMatchMedia.call(window, query) : { matches: false };
  };
})();

// Anti-Scroll-Trapping & Cross-Section Wheel Isolation Guard
// (a section's page-level wheel handler only runs while that section is the main one on screen, i.e. covers the middle of the viewport, wherever the pointer is)
      (function () {
        var origAdd = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type, listener, options) {
          if (type === 'wheel') {
            var target = this;
            var isGlobal = target === window || target === document || target === document.documentElement || target === document.body;
            var secId = window.__activeSectionRegisteringId || null;

            var safeWheel = function (e) {
              if (isGlobal && secId) {
                var sec = document.getElementById(secId);
                if (sec && !(function (box) { var m = window.innerHeight / 2; return box.top <= m && box.bottom >= m; })(sec.getBoundingClientRect())) {
                  return;
                }
              }

              var safeEvent = new Proxy(e, {
                get: function (t, prop) {
                  if (prop === 'preventDefault') {
                    return function () {
                      // a component that holds the page on purpose ([data-scroll-pin]) decides for itself when to let go
                      var pinned = e.target && e.target.closest && e.target.closest('[data-scroll-pin]');
                      if (pinned || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                        e.preventDefault();
                      }
                    };
                  }
                  var val = t[prop];
                  return typeof val === 'function' ? val.bind(t) : val;
                }
              });

              return listener.call(this, safeEvent);
            };

            return origAdd.call(this, type, safeWheel, options);
          }
          return origAdd.call(this, type, listener, options);
        };
      })();

`;
}

const api = { LAZY_SECTION_RUNTIME, OFFSCREEN_RUNTIME, REVIEW_RUNTIME, OVERRIDES_RUNTIME, PRELOADER_DISMISS_PREVIEW, PRELOADER_DISMISS_EXPORT, previewPageScript };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmRuntimes = api;
})();
