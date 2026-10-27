/**
 * Content editor (admin.html). Edits the text, pictures, links and colours of the exported website.
 *
 * Data: window.EDV_CMS (cms-content.js) lists every page, section and field and the values that are published.
 * "Publish" saves the values in this browser, where the website picks them up. "Download cms-content.js" writes the
 * same values into a file; upload it next to the website so every visitor sees them.
 * There is no login: whoever can open this page can edit it in their own browser, and only the uploaded file changes the live site.
 */
(function () {
  'use strict';

  var C = window.EDV_CMS;
  var $ = function (id) { return document.getElementById(id); };
  if (!C || !Array.isArray(C.pages) || !C.pages.length) {
    $('cms-editor').textContent = 'cms-content.js is missing or empty. Keep it next to admin.html.';
    return;
  }

  // Same list as the builder's Content tab (scripts/builder-extras.js)
  var CURRENCIES = [
    ['$', 'US dollar'], ['€', 'Euro'], ['£', 'British pound'], ['¥', 'Yen / Yuan'], ['₹', 'Indian rupee'], ['CHF', 'Swiss franc'],
    ['kr', 'Krona / Krone'], ['zł', 'Polish złoty'], ['Kč', 'Czech koruna'], ['Ft', 'Hungarian forint'], ['₽', 'Russian ruble'], ['₺', 'Turkish lira'],
    ['₩', 'Korean won'], ['R$', 'Brazilian real'], ['A$', 'Australian dollar'], ['C$', 'Canadian dollar'], ['₪', 'Israeli shekel'], ['AED', 'UAE dirham']
  ];
  /** Digits with one decimal sign (. or ,): what a price may contain. */
  function onlyNumber(v) {
    var s = String(v).replace(/[^0-9.,]/g, '');
    var i = s.search(/[.,]/);
    return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/[.,]/g, '');
  }

  var MAX_HISTORY = 60;
  var BACKUP_TAB = '__backup';
  var siteKey = 'edv-cms:' + location.pathname.replace(/[^/]*$/, '');

  var pageIndex = 0;
  var tab = null; // section id or BACKUP_TAB
  var draft = {};
  var history = [];
  var cursor = -1;
  var historyTimer = null;
  var pickTarget = null; // { sec, f, setValue } while the picture picker is open
  var previewReady = false;
  var toastTimer = null;

  /* ---------------- storage ---------------- */
  // Opened from the builder's Content tab: the page is edited in place and every change goes straight to the builder.
  var bridge = null;
  try { bridge = window.parent !== window && window.parent.__cmsBridge || null; } catch (e) { bridge = null; }
  var inBuilder = !!bridge;
  var memory = {}; // inside the builder nothing is kept in the browser's storage
  function read(kind) {
    if (inBuilder) return memory[kind] || null;
    try { return JSON.parse(localStorage.getItem(siteKey + ':' + kind) || 'null'); } catch (e) { return null; }
  }
  function write(kind, value) {
    if (inBuilder) { memory[kind] = clone(value); return true; }
    try { localStorage.setItem(siteKey + ':' + kind, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  /** The published values: whichever is newer, the file uploaded with the site or this browser's copy. */
  function publishedValues() {
    var local = read('published');
    if (local && local.values && (local.savedAt || 0) > (C.updatedAt || 0)) return local.values;
    return C.published || {};
  }

  /* ---------------- model ---------------- */
  function page() { return C.pages[pageIndex]; }
  function sections() { return page().sections; }
  function findSection(id) { var s = sections().filter(function (x) { return x.id === id; }); return s[0] || null; }

  function getVal(file, sec, f) {
    var v = draft[file] && draft[file][sec.id] && draft[file][sec.id][f.id];
    return typeof v === 'string' ? v : f.value;
  }
  function setVal(file, sec, f, value) {
    if (value === f.value) {
      if (draft[file] && draft[file][sec.id]) {
        delete draft[file][sec.id][f.id];
        if (!Object.keys(draft[file][sec.id]).length) delete draft[file][sec.id];
        if (!Object.keys(draft[file]).length) delete draft[file];
      }
      return;
    }
    draft[file] = draft[file] || {};
    draft[file][sec.id] = draft[file][sec.id] || {};
    draft[file][sec.id][f.id] = value;
  }
  function isEdited(file, sec, f) { return getVal(file, sec, f) !== f.value; }
  function editedCount(file, sec) { return sec.fields.filter(function (f) { return isEdited(file, sec, f); }).length; }

  /** Only addresses a page may load: web, mail, phone, in-page and relative paths (and small embedded pictures). */
  function safeUrl(value, type) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return '';
    if (/^(https?:|mailto:|tel:|#|\/|\.{1,2}\/)/i.test(v)) return v;
    if (inBuilder && type === 'link' && /^page:[A-Za-z0-9_-]+$/.test(v)) return v; // a link to another page of the site
    if (type === 'image' && /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(v)) return v;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
    return '';
  }

  /* ---------------- UI helpers ---------------- */
  function el(tag, props, kids) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'class') node.className = props[k];
      else if (k === 'text') node.textContent = props[k];
      else if (k === 'on') Object.keys(props.on).forEach(function (ev) { node.addEventListener(ev, props.on[ev]); });
      else if (props[k] !== false && props[k] != null) node.setAttribute(k, props[k] === true ? '' : props[k]);
    });
    (kids || []).forEach(function (kid) { if (kid) node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid); });
    return node;
  }

  function toast(message) {
    var t = $('cms-toast');
    t.textContent = message;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function isDirty() { return JSON.stringify(draft) !== JSON.stringify(publishedValues()); }

  function refreshStatus() {
    if (inBuilder) {
      $('cms-pill').textContent = 'Saved to your page';
      $('cms-publish').textContent = 'Done';
      $('cms-publish').disabled = false;
      $('cms-undo').disabled = cursor <= 0;
      $('cms-redo').disabled = cursor >= history.length - 1;
      return;
    }
    var dirty = isDirty();
    var pill = $('cms-pill');
    pill.textContent = dirty ? 'Unpublished changes' : 'Published';
    pill.classList.toggle('is-dirty', dirty);
    var btn = $('cms-publish');
    btn.textContent = dirty ? 'Publish changes' : 'Published';
    btn.disabled = !dirty;
    $('cms-undo').disabled = cursor <= 0;
    $('cms-redo').disabled = cursor >= history.length - 1;
  }

  /* ---------------- history ---------------- */
  function snapshot() {
    clearTimeout(historyTimer);
    historyTimer = null;
    var s = JSON.stringify(draft);
    if (cursor >= 0 && JSON.stringify(history[cursor]) === s) return;
    history.splice(cursor + 1);
    history.push(clone(draft));
    if (history.length > MAX_HISTORY) history.shift();
    cursor = history.length - 1;
    if ($('cms-undo')) refreshStatus();
  }
  function goHistory(step) {
    if (historyTimer) snapshot();
    var next = cursor + step;
    if (next < 0 || next >= history.length) return;
    cursor = next;
    draft = clone(history[cursor]);
    changed(true);
  }

  /** Called after every change: save the draft, update the preview and the lists. */
  var synced = {};
  var syncTimer = null;
  /** Sends every field that differs from what the builder has (an empty value clears the edit). */
  function syncBuilder() {
    clearTimeout(syncTimer);
    syncTimer = null;
    var file = page().file;
    sections().forEach(function (sec) {
      sec.fields.forEach(function (f) {
        var want = (draft[file] && draft[file][sec.id] && draft[file][sec.id][f.id]) || '';
        var key = sec.id + '/' + f.id;
        if ((synced[key] || '') === want) return;
        synced[key] = want;
        bridge.setOverride(sec.id, f.id, want, { selector: f.selector, type: f.type, attr: f.attr });
      });
    });
  }

  function changed(rerender) {
    write('draft', { savedAt: Date.now(), values: draft });
    if (inBuilder) { clearTimeout(syncTimer); syncTimer = setTimeout(syncBuilder, 300); }
    pushPreview();
    refreshStatus();
    if (rerender) render(); else refreshNavMeta();
  }
  function edited() {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(snapshot, 450);
    changed(false);
  }

  /* ---------------- preview ---------------- */
  var frame = $('cms-frame');
  function loadPreview() {
    previewReady = false;
    if (window.EDV_CMS_FRAMES) frame.srcdoc = window.EDV_CMS_FRAMES[page().file] || '';
    else frame.src = page().file + '?cms-preview=1';
  }
  function pushPreview() {
    if (!previewReady || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type: 'edv-cms:values', values: draft }, '*');
  }
  function focusPreview(secId, fieldId) {
    if (!previewReady || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type: 'edv-cms:focus', section: secId, field: fieldId || '' }, '*');
  }
  window.addEventListener('message', function (e) {
    if (e.source !== frame.contentWindow || !e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'edv-cms:ready') { previewReady = true; pushPreview(); }
    if (e.data.type === 'edv-cms:pick' && e.data.page === page().file) {
      if (!findSection(e.data.section)) return;
      select(e.data.section, e.data.field, true);
    }
  });
  frame.addEventListener('load', function () { setTimeout(function () { if (!previewReady) { previewReady = true; pushPreview(); } }, 600); });

  /* ---------------- navigation ---------------- */
  function sectionLabel(sec, i) {
    var dupes = sections().filter(function (s) { return s.title === sec.title; }).length > 1;
    return dupes ? (i + 1) + '. ' + sec.title : sec.title;
  }

  function renderNav() {
    var nav = $('cms-nav');
    nav.textContent = '';
    sections().forEach(function (sec, i) {
      var n = editedCount(page().file, sec);
      var meta = el('span', { class: 'cms-nav-meta' }, [
        n ? el('span', { class: 'cms-dot', title: n + ' edited' }) : null,
        el('span', { class: 'cms-count', text: String(sec.fields.length) })
      ]);
      nav.appendChild(el('button', {
        type: 'button', class: 'cms-nav-item' + (tab === sec.id ? ' is-active' : ''), 'data-tab': sec.id,
        on: { click: function () { select(sec.id, null, false); focusPreview(sec.id); } }
      }, [el('span', { class: 'cms-nav-title', text: sectionLabel(sec, i) }), meta]));
    });
    $('cms-nav-backup').classList.toggle('is-active', tab === BACKUP_TAB);
  }
  function refreshNavMeta() {
    var items = $('cms-nav').children;
    sections().forEach(function (sec, i) {
      var item = items[i];
      if (!item) return;
      var meta = item.querySelector('.cms-nav-meta');
      var n = editedCount(page().file, sec);
      var dot = meta.querySelector('.cms-dot');
      if (n && !dot) meta.insertBefore(el('span', { class: 'cms-dot', title: n + ' edited' }), meta.firstChild);
      else if (!n && dot) dot.remove();
      else if (dot) dot.title = n + ' edited';
    });
    var card = $('cms-editor').querySelectorAll('.cms-card');
    for (var k = 0; k < card.length; k++) {
      var sec = findSection(tab);
      if (!sec) break;
      var f = sec.fields[+card[k].getAttribute('data-index')];
      if (f) card[k].classList.toggle('is-edited', isEdited(page().file, sec, f));
    }
  }

  function select(id, fieldId, fromPreview) {
    tab = id;
    $('cms-search').value = '';
    render();
    if (fieldId) {
      var card = $('cms-editor').querySelector('[data-field="' + fieldId + '"]');
      if (card) {
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
        card.classList.add('is-flash');
        setTimeout(function () { card.classList.remove('is-flash'); }, 1500);
        var input = card.querySelector('textarea, input[type=text]');
        if (input) input.focus({ preventScroll: true });
      }
      if (!fromPreview) focusPreview(id, fieldId);
    }
    var ws = $('cms-workspace');
    if (fromPreview) ws.classList.remove('show-preview');
  }

  /* ---------------- field editors ---------------- */
  function fieldCard(sec, f, index) {
    var file = page().file;
    var value = getVal(file, sec, f);
    var card = el('div', { class: 'cms-card' + (isEdited(file, sec, f) ? ' is-edited' : ''), 'data-field': f.id, 'data-index': String(index) });
    var reset = el('button', { type: 'button', class: 'cms-reset', text: 'Reset', title: 'Back to the original', on: { click: function () {
      setVal(file, sec, f, f.value); snapshot(); changed(true);
    } } });
    function syncReset() { reset.hidden = !isEdited(file, sec, f); }
    card.appendChild(el('div', { class: 'cms-card-head' }, [
      el('label', { class: 'cms-label', text: f.label }),
      el('div', { class: 'cms-card-actions' }, [reset, el('span', { class: 'cms-type', text: f.type })])
    ]));
    function commit(v) { setVal(file, sec, f, v); syncReset(); edited(); }

    if (f.type === 'image') {
      var thumb = el('img', { class: 'cms-thumb', alt: '' });
      function paintThumb(v) { var u = safeUrl(v, 'image'); if (u) thumb.src = u; else thumb.removeAttribute('src'); }
      paintThumb(value);
      var urlInput = el('input', { type: 'text', class: 'cms-input', autocomplete: 'off', 'aria-label': f.label + ' address' });
      urlInput.value = /^data:/.test(value) ? '(uploaded picture)' : value;
      urlInput.addEventListener('focus', function () { if (/^data:/.test(urlInput.value) || urlInput.value === '(uploaded picture)') urlInput.select(); });
      urlInput.addEventListener('input', function () {
        var clean = safeUrl(urlInput.value, 'image');
        urlInput.setAttribute('aria-invalid', clean || !urlInput.value.trim() ? 'false' : 'true');
        if (!clean && urlInput.value.trim()) return;
        paintThumb(clean); commit(clean || f.value);
      });
      var choose = el('button', { type: 'button', class: 'cms-btn cms-btn-ghost cms-btn-sm', text: 'Choose or upload…', on: { click: function () {
        openMedia({ current: getVal(file, sec, f), set: function (v) {
          urlInput.value = /^data:/.test(v) ? '(uploaded picture)' : v; paintThumb(v); commit(v);
        } });
      } } });
      card.appendChild(el('div', { class: 'cms-image-row' }, [thumb, el('div', { class: 'cms-image-side' }, [urlInput, el('div', { class: 'cms-inline' }, [choose])])]));
    } else if (f.type === 'color') {
      var picker = el('input', { type: 'color', 'aria-label': f.label });
      var hex = el('input', { type: 'text', class: 'cms-input', maxlength: '7', autocomplete: 'off', 'aria-label': f.label + ' (hex)' });
      picker.value = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
      hex.value = value;
      picker.addEventListener('input', function () { hex.value = picker.value; commit(picker.value); });
      hex.addEventListener('input', function () { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { picker.value = hex.value; commit(hex.value.toLowerCase()); } });
      card.appendChild(el('div', { class: 'cms-color-row' }, [picker, hex]));
    } else if (f.type === 'currency') {
      var sel = el('select', { class: 'cms-input', 'aria-label': f.label });
      var known = CURRENCIES.some(function (c) { return c[0] === value; });
      if (!known) sel.appendChild(el('option', { value: value, text: value + '  (current)' }));
      CURRENCIES.forEach(function (c) { sel.appendChild(el('option', { value: c[0], text: (c[0] || '–') + '  ' + c[1] })); });
      sel.value = value;
      sel.addEventListener('change', function () { commit(sel.value); });
      card.appendChild(sel);
    } else if (f.type === 'number') {
      var num = el('input', { type: 'text', class: 'cms-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '0', 'aria-label': f.label + ' (numbers only)' });
      num.value = value;
      num.addEventListener('input', function () {
        var clean = onlyNumber(num.value);
        if (clean !== num.value) num.value = clean;
        commit(clean);
      });
      card.appendChild(el('div', { class: 'cms-inline' }, [num, el('span', { class: 'cms-hint', text: 'Numbers only' })]));
    } else if (f.type === 'link') {
      var link = el('input', { type: 'text', class: 'cms-input', autocomplete: 'off', placeholder: 'https://… or page.html or #section', 'aria-label': f.label });
      link.value = value;
      link.addEventListener('input', function () {
        var clean = safeUrl(link.value, 'link');
        link.setAttribute('aria-invalid', clean || !link.value.trim() ? 'false' : 'true');
        if (!clean && link.value.trim()) return;
        commit(clean);
      });
      card.appendChild(link);
    } else {
      var area = el('textarea', { class: 'cms-textarea', rows: value.length > 90 || value.indexOf('\n') >= 0 ? '4' : '1', 'aria-label': f.label });
      area.value = value;
      area.addEventListener('input', function () { commit(area.value); });
      card.appendChild(area);
    }
    syncReset();
    return card;
  }

  function renderSection(sec) {
    var ed = $('cms-editor');
    var q = $('cms-search').value.trim().toLowerCase();
    ed.appendChild(el('div', { class: 'cms-section-head' }, [
      el('p', { text: sec.fields.length + ' editable ' + (sec.fields.length === 1 ? 'item' : 'items') + (inBuilder ? ' in this section. Changes show in the preview and are saved to your page as you type.' : ' in this section. Changes show in the preview straight away; press Publish to keep them.') }),
      el('button', { type: 'button', class: 'cms-btn cms-btn-ghost cms-btn-sm', text: 'Show in preview', on: { click: function () { $('cms-workspace').classList.add('show-preview'); focusPreview(sec.id); } } })
    ]));
    var shown = 0;
    sec.fields.forEach(function (f, i) {
      if (q && (f.label + ' ' + getVal(page().file, sec, f)).toLowerCase().indexOf(q) < 0) return;
      ed.appendChild(fieldCard(sec, f, i));
      shown++;
    });
    if (!sec.fields.length) ed.appendChild(el('p', { class: 'cms-empty', text: 'This section has no text, pictures or links the editor can change. It is part of the design.' }));
    else if (!shown) ed.appendChild(el('p', { class: 'cms-empty', text: 'No field matches “' + q + '”.' }));
  }

  /* ---------------- publishing & backup ---------------- */
  function contentFileText() {
    var out = clone(C);
    out.published = clone(draft);
    out.updatedAt = Date.now();
    return '/* Content published from admin.html. Upload this file next to index.html to change the live website. */\nwindow.EDV_CMS = ' + JSON.stringify(out, null, 2) + ';\n';
  }
  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = el('a', { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function publish() {
    if (historyTimer) snapshot();
    if (inBuilder) { syncBuilder(); bridge.close(); return true; }
    if (!write('published', { savedAt: Date.now(), values: clone(draft) })) { toast('This browser would not save the changes. Download cms-content.js instead.'); return false; }
    refreshStatus();
    toast('Published in this browser. Download cms-content.js to put it on the live site.');
    return true;
  }

  /** Accepts only values for fields this site really has, with web-safe addresses. */
  function sanitizeImport(raw) {
    var out = {}, kept = 0;
    if (!raw || typeof raw !== 'object') return { values: out, kept: 0 };
    C.pages.forEach(function (p) {
      var rp = raw[p.file];
      if (!rp || typeof rp !== 'object') return;
      p.sections.forEach(function (sec) {
        var rs = rp[sec.id];
        if (!rs || typeof rs !== 'object') return;
        sec.fields.forEach(function (f) {
          var v = rs[f.id];
          if (typeof v !== 'string' || v === f.value) return;
          if (f.type === 'image' || f.type === 'link') { v = safeUrl(v, f.type); if (!v) return; }
          if (f.type === 'color' && !/^#[0-9a-f]{6}$/i.test(v)) return;
          if (f.type === 'number' && onlyNumber(v) !== v) return;
          if (f.type === 'currency' && v.length > 6) return;
          out[p.file] = out[p.file] || {}; out[p.file][sec.id] = out[p.file][sec.id] || {};
          out[p.file][sec.id][f.id] = v; kept++;
        });
      });
    });
    return { values: out, kept: kept };
  }

  function renderBackup() {
    var ed = $('cms-editor');
    var total = 0;
    C.pages.forEach(function (p) { p.sections.forEach(function (s) { total += editedCount(p.file, s); }); });
    var importInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    importInput.addEventListener('change', function () {
      var file = importInput.files && importInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var parsed;
        try { parsed = JSON.parse(String(reader.result)); } catch (e) { toast('That file is not valid JSON.'); return; }
        var result = sanitizeImport(parsed && parsed.values ? parsed.values : parsed);
        if (!result.kept) { toast('Nothing in that file matches this website.'); return; }
        draft = result.values; snapshot(); changed(true);
        toast('Loaded ' + result.kept + ' changed ' + (result.kept === 1 ? 'item' : 'items') + '. Review them, then publish.');
      };
      reader.readAsText(file);
      importInput.value = '';
    });

    ed.appendChild(el('div', { class: 'cms-panel' }, [
      el('h2', { text: 'Put the changes on the live website' }),
      el('ol', {}, [
        el('li', { text: 'Press Publish. The website you open in this browser now shows the changes.' }),
        el('li', { text: 'Download cms-content.js and upload it to your web host, replacing the old file next to index.html.' }),
        el('li', { text: 'From then on every visitor sees the new content.' })
      ]),
      el('div', { class: 'cms-inline' }, [
        el('button', { type: 'button', class: 'cms-btn cms-btn-primary', text: 'Download cms-content.js', on: { click: function () {
          if (isDirty() && !publish()) return;
          download('cms-content.js', contentFileText(), 'text/javascript');
        } } })
      ]),
      el('p', { class: 'cms-hint', text: 'This editor has no login. Anyone who opens admin.html can change content in their own browser, but only the file you upload changes the live site. Keep admin.html off the public host if you do not want others to see it.' })
    ]));

    ed.appendChild(el('div', { class: 'cms-panel' }, [
      el('h2', { text: 'Backup' }),
      el('p', { class: 'cms-hint', text: total + ' changed ' + (total === 1 ? 'item' : 'items') + ' compared with the original page.' }),
      el('div', { class: 'cms-inline' }, [
        el('button', { type: 'button', class: 'cms-btn', text: 'Save changes as JSON', on: { click: function () {
          download('content-backup.json', JSON.stringify({ version: 1, savedAt: new Date().toISOString(), values: draft }, null, 2), 'application/json');
        } } }),
        el('label', { class: 'cms-btn' }, ['Load a JSON backup…', importInput]),
        el('button', { type: 'button', class: 'cms-btn cms-btn-ghost', text: 'Discard unpublished changes', disabled: !isDirty(), on: { click: function () {
          if (!confirm('Throw away the changes that are not published yet?')) return;
          draft = clone(publishedValues()); snapshot(); changed(true);
        } } }),
        el('button', { type: 'button', class: 'cms-btn cms-btn-danger', text: 'Reset everything to the original', disabled: !total, on: { click: function () {
          if (!confirm('Remove every change and go back to the original content? You can still undo.')) return;
          draft = {}; snapshot(); changed(true);
        } } })
      ])
    ]));
  }

  /* ---------------- picture picker ---------------- */
  function knownPictures() {
    var seen = {}, list = [];
    function add(src, label) {
      var u = safeUrl(src, 'image');
      if (!u || seen[u]) return;
      seen[u] = 1; list.push({ src: u, label: label });
    }
    (read('uploads') || []).forEach(function (u, i) { add(u, 'Uploaded ' + (i + 1)); });
    C.pages.forEach(function (p) { p.sections.forEach(function (s) { s.fields.forEach(function (f) {
      if (f.type !== 'image') return;
      add(getVal(p.file, s, f), f.label.replace(/^Image:\s*/, ''));
      add(f.value, f.label.replace(/^Image:\s*/, ''));
    }); }); });
    return list;
  }

  function openMedia(target) {
    pickTarget = target;
    var grid = $('cms-media-grid');
    grid.textContent = '';
    knownPictures().forEach(function (p) {
      grid.appendChild(el('button', { type: 'button', class: 'cms-media-item' + (p.src === target.current ? ' is-current' : ''), title: p.label, on: { click: function () { use(p.src); } } }, [
        el('img', { src: p.src, alt: '', loading: 'lazy' }), el('span', { text: p.label })
      ]));
    });
    if (!grid.children.length) grid.appendChild(el('p', { class: 'cms-hint', text: 'No pictures yet. Upload one or paste an address.' }));
    $('cms-media-url').value = '';
    $('cms-media').hidden = false;
    $('cms-media-close').focus();
  }
  function closeMedia() { $('cms-media').hidden = true; pickTarget = null; }
  function use(src) {
    var set = pickTarget && pickTarget.set;
    closeMedia();
    if (set) set(src);
  }

  /** Shrinks a photo to at most 1600 px wide so it fits in the browser's storage and in cms-content.js. */
  function shrink(file, done) {
    var reader = new FileReader();
    reader.onerror = function () { done(null); };
    reader.onload = function () {
      if (/svg/.test(file.type)) { done(String(reader.result)); return; }
      var img = new Image();
      img.onerror = function () { done(null); };
      img.onload = function () {
        var scale = Math.min(1, 1600 / img.naturalWidth);
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL(file.type === 'image/png' ? 'image/webp' : 'image/jpeg', 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  $('cms-upload').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('Please choose a picture file.'); return; }
    shrink(file, function (data) {
      if (!data) { toast('That picture could not be read.'); return; }
      var uploads = read('uploads') || [];
      uploads.unshift(data);
      if (!write('uploads', uploads.slice(0, 12))) toast('The picture is used, but this browser has no room to keep it in the list.');
      use(data);
    });
  });
  $('cms-media-use').addEventListener('click', function () {
    var clean = safeUrl($('cms-media-url').value, 'image');
    if (!clean) { toast('Enter a web address or a path such as assets/photo.jpg.'); return; }
    use(clean);
  });
  $('cms-media-close').addEventListener('click', closeMedia);
  $('cms-media').addEventListener('click', function (e) { if (e.target === $('cms-media')) closeMedia(); });

  /* ---------------- render ---------------- */
  function render() {
    var ed = $('cms-editor');
    ed.textContent = '';
    renderNav();
    var title = $('cms-title');
    $('cms-search').hidden = tab === BACKUP_TAB;
    if (tab === BACKUP_TAB) { title.textContent = 'Publishing & backup'; renderBackup(); }
    else {
      var sec = findSection(tab);
      title.textContent = sec ? sec.title : page().title;
      if (sec) renderSection(sec);
    }
    refreshStatus();
  }

  /* ---------------- start ---------------- */
  $('cms-site-name').textContent = C.site || 'Website';
  document.title = 'Content editor · ' + (C.site || 'Website');

  var saved = read('draft');
  draft = sanitizeImport(saved && saved.values ? saved.values : publishedValues()).values;
  snapshot();

  var pageSelect = $('cms-page-select');
  if (C.pages.length > 1) {
    $('cms-page-pick').hidden = false;
    C.pages.forEach(function (p, i) { pageSelect.appendChild(el('option', { value: String(i), text: p.title })); });
    pageSelect.addEventListener('change', function () {
      pageIndex = +pageSelect.value;
      tab = sections()[0] ? sections()[0].id : BACKUP_TAB;
      render(); loadPreview();
    });
  }
  $('cms-view-site').setAttribute('href', page().file);
  if (inBuilder) {
    $('cms-view-site').hidden = true;
    $('cms-nav-backup').hidden = true;
    $('cms-site-link').removeAttribute('href');
    sections().forEach(function (sec) { sec.fields.forEach(function (f) { var v = draft[page().file] && draft[page().file][sec.id] && draft[page().file][sec.id][f.id]; if (v) synced[sec.id + '/' + f.id] = v; }); });
  }

  tab = sections()[0] ? sections()[0].id : BACKUP_TAB;
  render();
  loadPreview();

  $('cms-nav-backup').addEventListener('click', function () { tab = BACKUP_TAB; render(); });
  $('cms-publish').addEventListener('click', publish);
  $('cms-undo').addEventListener('click', function () { goHistory(-1); });
  $('cms-redo').addEventListener('click', function () { goHistory(1); });
  $('cms-search').addEventListener('input', function () { var sec = findSection(tab); if (sec) { $('cms-editor').textContent = ''; renderSection(sec); } });
  $('cms-reload-preview').addEventListener('click', loadPreview);
  $('cms-toggle-preview').addEventListener('click', function (e) {
    var ws = $('cms-workspace');
    var narrow = window.matchMedia('(max-width: 1100px)').matches;
    if (narrow) { ws.classList.toggle('show-preview'); e.currentTarget.setAttribute('aria-pressed', String(ws.classList.contains('show-preview'))); }
    else { ws.classList.toggle('no-preview'); e.currentTarget.setAttribute('aria-pressed', String(!ws.classList.contains('no-preview'))); }
  });
  Array.prototype.forEach.call(document.querySelectorAll('.cms-vp'), function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.cms-vp'), function (b) { b.classList.toggle('is-active', b === btn); });
      $('cms-stage').setAttribute('data-vp', btn.getAttribute('data-vp'));
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('cms-media').hidden) { closeMedia(); return; }
    if (!(e.ctrlKey || e.metaKey)) return;
    var k = e.key.toLowerCase();
    var typing = /^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '');
    if (k === 's') { e.preventDefault(); if (inBuilder || isDirty()) publish(); }
    else if (k === 'z' && !typing) { e.preventDefault(); goHistory(e.shiftKey ? 1 : -1); }
    else if (k === 'y' && !typing) { e.preventDefault(); goHistory(1); }
  });
})();
