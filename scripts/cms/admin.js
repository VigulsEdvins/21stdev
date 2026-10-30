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
  // the admin and its preview are the same site; a page with an opaque origin (file://, sandbox) cannot name it, so only there any origin is accepted
  var TARGET = location.origin && location.origin !== 'null' ? location.origin : '*'; // postmessage-ok: an opaque origin (file://, sandbox) cannot be named

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
  var FORM_TAB = '__forms';
  var LANG_TAB = '__langs';
  var R = window.EdvFormRules; // the choices and checks for where form messages go (form-rules.js)
  var siteKey = 'edv-cms:' + location.pathname.replace(/[^/]*$/, '');

  var pageIndex = 0;
  var tab = null; // section id, BACKUP_TAB, FORM_TAB or LANG_TAB
  var draft = {};
  var history = [];
  var cursor = -1;
  var historyTimer = null;
  var pickTarget = null; // { sec, f, setValue } while the picture picker is open
  var previewReady = false;
  var frameSizes = {}; // 'section/field' -> [width, height] of each picture's real frame, reported by the preview
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
  /** Stores or clears one draft key (a field, or a picture's "<id>__fit"): a value equal to the original is no edit. */
  function setKey(file, sec, key, value, original) {
    if (value === original) {
      if (draft[file] && draft[file][sec.id]) {
        delete draft[file][sec.id][key];
        if (!Object.keys(draft[file][sec.id]).length) delete draft[file][sec.id];
        if (!Object.keys(draft[file]).length) delete draft[file];
      }
      return;
    }
    draft[file] = draft[file] || {};
    draft[file][sec.id] = draft[file][sec.id] || {};
    draft[file][sec.id][key] = value;
  }
  function setVal(file, sec, f, value) { setKey(file, sec, f.id, value, f.value); }
  /** How a picture fills its frame: "cover|x|y|zoom" or "contain|x|y|zoom" (x, y = focus in %, zoom in %). */
  function getFit(file, sec, f) {
    var v = draft[file] && draft[file][sec.id] && draft[file][sec.id][f.id + '__fit'];
    return typeof v === 'string' ? v : f.fit;
  }
  function setFit(file, sec, f, value) { setKey(file, sec, f.id + '__fit', value, f.fit); }
  /** A field can also be hidden ("<id>__hide" = "1") or moved ("<id>__move" = places down, negative = up). */
  function getHide(file, sec, f) { var v = draft[file] && draft[file][sec.id] && draft[file][sec.id][f.id + '__hide']; return v === '1'; }
  function setHide(file, sec, f, on) { setKey(file, sec, f.id + '__hide', on ? '1' : '', ''); }
  function getMove(file, sec, f) { var n = parseInt(draft[file] && draft[file][sec.id] && draft[file][sec.id][f.id + '__move'], 10); return isFinite(n) ? n : 0; }
  function setMove(file, sec, f, n) { setKey(file, sec, f.id + '__move', n ? String(n) : '', ''); }
  /** Placed by hand: "<id>__shift" = "x|y", a percent of the block's width. */
  var SHIFT_RE = /^-?\d{1,3}(\.\d)?\|-?\d{1,3}(\.\d)?$/;
  function getShift(file, sec, f) { var v = draft[file] && draft[file][sec.id] && draft[file][sec.id][f.id + '__shift']; return typeof v === 'string' && SHIFT_RE.test(v) ? v : ''; }
  function setShift(file, sec, f, v) { setKey(file, sec, f.id + '__shift', v, ''); }
  function isEdited(file, sec, f) { return getVal(file, sec, f) !== f.value || (!!f.fit && getFit(file, sec, f) !== f.fit) || getHide(file, sec, f) || getMove(file, sec, f) !== 0 || !!getShift(file, sec, f); }
  function editedCount(file, sec) { return sec.fields.filter(function (f) { return isEdited(file, sec, f); }).length; }

  /* Where form messages go: one choice for the whole site, kept in the draft as `__form` only when it differs from the exported one */
  function formDefault() { var f = C.forms || {}; return { method: String(f.method || ''), target: String(f.target || '') }; }
  function getForm() { var f = draft.__form; return f && typeof f.method === 'string' ? { method: f.method, target: String(f.target || '') } : formDefault(); }
  function setForm(method, target) {
    var d = formDefault();
    if (method === d.method && target === d.target) delete draft.__form;
    else draft.__form = { method: method, target: target };
  }
  /** The error to show for the current choice, or '' when it is fine. */
  function formProblem() { var f = getForm(); var r = R ? R.check(f.method, f.target) : { ok: true }; return r.ok ? '' : r.error; }
  /* Languages: pages carry `lang` and `group` (the original page they translate). The choice of which languages the site offers is kept as `__langs` only when some are off */
  var LANG_NAMES = { en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano', pt: 'Português', nl: 'Nederlands', pl: 'Polski', lv: 'Latviešu', lt: 'Lietuvių', et: 'Eesti', ru: 'Русский', uk: 'Українська', sv: 'Svenska', no: 'Norsk', nb: 'Norsk', da: 'Dansk', fi: 'Suomi', cs: 'Čeština', sk: 'Slovenčina', hu: 'Magyar', ro: 'Română', bg: 'Български', el: 'Ελληνικά', tr: 'Türkçe', ja: '日本語', zh: '中文', ko: '한국어', ar: 'العربية', he: 'עברית', hi: 'हिन्दी' };
  function langName(code) { return LANG_NAMES[code] || LANG_NAMES[String(code).split('-')[0]] || String(code).toUpperCase(); }
  function langOf(p) { return p.lang || C.siteLang || ''; }
  /** Every language of the site, the main one first. */
  function allLangs() {
    var out = [];
    C.pages.forEach(function (p) { var l = langOf(p); if (l && out.indexOf(l) < 0) out.push(l); });
    var main = C.siteLang && out.indexOf(C.siteLang) >= 0 ? C.siteLang : out[0];
    return out.length ? [main].concat(out.filter(function (l) { return l !== main; })) : out;
  }
  /** Inside the builder: the project's languages and the ones that can still be added; null when the builder has no languages. */
  function builderLangs() {
    if (!inBuilder || !bridge.languages) return null;
    try { return bridge.languages(); } catch (e) { return null; }
  }
  /** Runs a builder action that reopens the panel on another page: what was typed is sent first. */
  function leaveFor(action) { if (syncTimer) syncBuilder(); return action(); }
  function hasLangs() { return allLangs().length > 1; }
  /** The languages the site offers: all of them unless the owner turned some off; the main language is always on. */
  function getLangs() {
    var all = allLangs(), d = draft.__langs;
    if (!Array.isArray(d)) return all;
    return all.filter(function (l, i) { return i === 0 || d.indexOf(l) >= 0; });
  }
  function setLangs(list) {
    var all = allLangs();
    var keep = all.filter(function (l, i) { return i === 0 || list.indexOf(l) >= 0; });
    if (keep.length === all.length) delete draft.__langs; else draft.__langs = keep;
  }
  /** The page this one translates: same group, written in the main language; null for the main-language pages themselves. */
  function sourcePage(p) {
    if (!p.group || !hasLangs() || langOf(p) === allLangs()[0]) return null;
    var found = null;
    C.pages.forEach(function (q) { if (q !== p && q.group === p.group && langOf(q) === allLangs()[0]) found = q; });
    return found;
  }
  /** The original wording of a field in the main language, or '' when this page is not a translation or the field has no wording. */
  function originalOf(sec, f) {
    var src = sourcePage(page());
    if (!src || f.type === 'image' || f.type === 'color' || f.type === 'number' || f.type === 'currency') return '';
    var ss = src.sections[sections().indexOf(sec)];
    if (!ss || ss.slug !== sec.slug) return '';
    var sf = ss.fields.filter(function (x) { return x.id === f.id; })[0];
    return sf ? getVal(src.file, ss, sf) : '';
  }
  /** [still the same as the original, total] over the wording of every page in language `code`. */
  function untranslated(code) {
    var same = 0, total = 0;
    C.pages.forEach(function (p) {
      if (langOf(p) !== code || !sourcePage(p)) return;
      var src = sourcePage(p);
      p.sections.forEach(function (sec, i) {
        var ss = src.sections[i];
        if (!ss || ss.slug !== sec.slug) return;
        sec.fields.forEach(function (f) {
          if (f.type === 'image' || f.type === 'color' || f.type === 'number' || f.type === 'currency' || f.type === 'link') return;
          var sf = ss.fields.filter(function (x) { return x.id === f.id; })[0];
          if (!sf) return;
          total++;
          if (getVal(p.file, sec, f) === getVal(src.file, ss, sf)) same++;
        });
      });
    });
    return [same, total];
  }

  function hasForms() { return !!(C.forms && C.forms.has) && !!R; }

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
      sec.fields.forEach(function (f) {
        [['__hide', 'hide'], ['__move', 'move'], ['__shift', 'shift']].forEach(function (k) {
          var want = (draft[file] && draft[file][sec.id] && draft[file][sec.id][f.id + k[0]]) || '';
          var key = sec.id + '/' + f.id + k[0];
          if ((synced[key] || '') === want) return;
          synced[key] = want;
          bridge.setOverride(sec.id, f.id + k[0], want, { selector: f.selector, type: k[1] });
        });
      });
      sec.fields.forEach(function (f) {
        if (f.type !== 'image' || !f.fit) return;
        var wantFit = (draft[file] && draft[file][sec.id] && draft[file][sec.id][f.id + '__fit']) || '';
        var fitKey = sec.id + '/' + f.id + '__fit';
        if ((synced[fitKey] || '') === wantFit) return;
        synced[fitKey] = wantFit;
        bridge.setOverride(sec.id, f.id + '__fit', wantFit, { selector: f.selector, type: 'fit' });
      });
    });
  }

  var syncedForm = null;
  function syncForm() {
    var f = getForm();
    var r = R.check(f.method, f.target);
    if (!r.ok || !bridge.setForm) return; // an unfinished entry is not sent to the page
    var key = r.method + '|' + r.value;
    if (syncedForm === null) { syncedForm = formDefault().method + '|' + R.check(formDefault().method, formDefault().target).value; }
    if (key === syncedForm) return;
    syncedForm = key;
    bridge.setForm(r.method, r.method ? f.target : '');
  }

  function changed(rerender) {
    write('draft', { savedAt: Date.now(), values: draft });
    if (inBuilder) { clearTimeout(syncTimer); syncTimer = setTimeout(function () { syncBuilder(); if (hasForms()) syncForm(); }, 300); }
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
  /** Builder only: a setting that changes the page's markup (menu, sticky header, link name) shows in the preview at once. */
  function refreshPreview() {
    if (!inBuilder || !bridge.frameDoc || !window.EDV_CMS_FRAMES) return;
    try { var html = bridge.frameDoc(); if (html) { window.EDV_CMS_FRAMES[page().file] = html; loadPreview(); } } catch (e) { /* the preview stays as it was; Done still applies the change */ }
  }
  function pushPreview() {
    if (!previewReady || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type: 'edv-cms:values', values: draft }, TARGET);
  }
  function focusPreview(secId, fieldId) {
    if (!previewReady || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type: 'edv-cms:focus', section: secId, field: fieldId || '' }, TARGET);
  }
  window.addEventListener('message', function (e) {
    if (e.source !== frame.contentWindow || !e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'edv-cms:frames' && e.data.page === page().file && e.data.sizes) { frameSizes = e.data.sizes; document.querySelectorAll('.cms-fit').forEach(function (b) { if (b.repaint) b.repaint(true); }); }
    if (e.data.type === 'edv-cms:ready') { previewReady = true; pushPreview(); }
    if (e.data.type === 'edv-cms:shift' && e.data.page === page().file && typeof e.data.value === 'string' && SHIFT_RE.test(e.data.value)) {
      var ssec = findSection(e.data.section), sf = ssec && ssec.fields.filter(function (x) { return x.id === e.data.field; })[0];
      if (!sf) return;
      setShift(page().file, ssec, sf, e.data.value === '0|0' ? '' : e.data.value); snapshot(); changed(true);
      return;
    }
    if (e.data.type === 'edv-cms:move' && e.data.page === page().file && Number.isInteger(e.data.steps)) {
      var msec = findSection(e.data.section), mf = msec && msec.fields.filter(function (x) { return x.id === e.data.field; })[0];
      if (!mf || typeof mf.pos !== 'number' || !(mf.sibs > 1)) return;
      var file = page().file, now = getMove(file, msec, mf);
      var next = Math.max(-mf.pos, Math.min(mf.sibs - 1 - mf.pos, now + e.data.steps));
      if (next === now) return;
      setMove(file, msec, mf, next); snapshot(); changed(true);
      return;
    }
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
    $('cms-nav-forms').classList.toggle('is-active', tab === FORM_TAB);
    $('cms-nav-langs').classList.toggle('is-active', tab === LANG_TAB);
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
  /** Crop or fit a picture, move its focus and zoom, with a small copy of the picture's frame you can drag. */
  function fitEditor(sec, f, getSrc, onChange) {
    var file = page().file;
    var cur = String(getFit(file, sec, f)).split('|');
    var words = { center: [50, 50], top: [50, 0], bottom: [50, 100], left: [0, 50], right: [100, 50] };
    var start = words[cur[1]] || [Number(cur[1]), Number(cur[2])];
    var st = { mode: cur[0] === 'contain' ? 'contain' : 'cover', x: isNaN(start[0]) ? 50 : start[0], y: isNaN(start[1]) ? 50 : start[1], z: Number(cur[3]) || 100 };
    var ratio = 4 / 3;
    function frameRatio() { var sz = frameSizes[sec.id + '/' + f.id]; return sz && sz[0] > 0 && sz[1] > 0 ? sz[0] / sz[1] : ratio; }
    var crop = el('div', { class: 'cms-crop', title: 'Drag to move the picture, scroll to zoom' });
    crop.style.aspectRatio = String(frameRatio());
    var nat = null;
    var mode = el('select', { class: 'cms-input', 'aria-label': f.label + ': size' }, [el('option', { value: 'cover', text: 'Fill the frame (crop)' }), el('option', { value: 'contain', text: 'Fit whole picture' })]);
    function range(label, min, max, key) {
      var input = el('input', { type: 'range', min: String(min), max: String(max), step: '1', 'aria-label': f.label + ': ' + label });
      return { input: input, node: el('label', { class: 'cms-range' }, [el('span', { text: label }), input]) };
    }
    var rx = range('Move left / right', 0, 100), ry = range('Move up / down', 0, 100), rz = range('Zoom', 100, 300);
    function paint() {
      crop.style.aspectRatio = String(frameRatio());
      crop.style.width = Math.round(Math.min(280, 240 * frameRatio())) + 'px';
      var src = safeUrl(getSrc() || f.value, 'image');
      if (!src) { crop.hidden = true; return; }
      crop.hidden = false;
      crop.style.backgroundImage = 'url("' + src.replace(/"/g, '%22') + '")';
      if (!nat || nat.src !== src) {
        var im = new Image();
        im.onload = function () { nat = { w: im.naturalWidth, h: im.naturalHeight, src: src }; paint(); };
        im.src = src;
        return;
      }
      var W = crop.clientWidth, H = crop.clientHeight;
      var k = st.mode === 'contain' ? Math.min(W / nat.w, H / nat.h) : Math.max(W / nat.w, H / nat.h) * st.z / 100;
      crop.style.backgroundSize = (nat.w * k) + 'px ' + (nat.h * k) + 'px';
      crop.style.backgroundPosition = st.x + '% ' + st.y + '%';
      crop.setAttribute('data-over', JSON.stringify([nat.w * k - W, nat.h * k - H]));
    }
    function sync() { mode.value = st.mode; rx.input.value = st.x; ry.input.value = st.y; rz.input.value = st.z; rz.input.disabled = st.mode === 'contain'; }
    function save() {
      var plain = st.mode === 'cover' && st.x === 50 && st.y === 50 && st.z === 100;
      setFit(file, sec, f, plain ? 'cover|50|50|100' : st.mode + '|' + st.x + '|' + st.y + '|' + st.z);
      sync(); paint(); onChange();
    }
    mode.addEventListener('change', function () { st.mode = mode.value; save(); });
    rx.input.addEventListener('input', function () { st.x = +rx.input.value; save(); });
    ry.input.addEventListener('input', function () { st.y = +ry.input.value; save(); });
    rz.input.addEventListener('input', function () { st.z = +rz.input.value; save(); });
    var drag = null;
    crop.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, px: st.x, py: st.y }; crop.setPointerCapture(e.pointerId); e.preventDefault(); });
    crop.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var over = JSON.parse(crop.getAttribute('data-over') || '[0,0]');
      if (over[0] > 1) st.x = Math.max(0, Math.min(100, Math.round(drag.px - (e.clientX - drag.x) / over[0] * 100)));
      if (over[1] > 1) st.y = Math.max(0, Math.min(100, Math.round(drag.py - (e.clientY - drag.y) / over[1] * 100)));
      save();
    });
    crop.addEventListener('pointerup', function () { drag = null; });
    crop.addEventListener('pointercancel', function () { drag = null; });
    crop.addEventListener('wheel', function (e) {
      e.preventDefault();
      st.z = Math.max(100, Math.min(300, st.z + (e.deltaY < 0 ? 10 : -10)));
      if (st.mode === 'contain') st.mode = 'cover';
      save();
    }, { passive: false });
    sync();
    setTimeout(paint, 0);
    var box = el('div', { class: 'cms-fit' }, [crop, el('label', { class: 'cms-range' }, [el('span', { text: 'Picture size' }), mode]), rx.node, ry.node, rz.node,
      el('p', { class: 'cms-hint', text: 'Drag the picture in the frame (scroll to zoom), or use the sliders, until the main part sits in the frame.' })]);
    box.repaint = function () { paint(); };
    return box;
  }

  /** Where a link can go: the sections of this page ("#name") and the other pages. [{ value, label }] each. */
  function linkTargets() {
    if (inBuilder && bridge.targets) { try { return bridge.targets(); } catch (e) { /* no picker, the text box still works */ } }
    var out = { sections: [], pages: [] };
    (C.pages || []).forEach(function (p) {
      if (p.file === page().file) (p.sections || []).forEach(function (sec) { if (sec.anchor) out.sections.push({ value: '#' + sec.anchor, label: sec.title || sec.slug }); });
      else out.pages.push({ value: p.file, label: p.title || p.file });
    });
    return out;
  }

  /** The name a menu link uses to scroll to this section ("#pricing"). Editable in the builder only: the finished page has its anchors written into it. */
  function anchorCard(sec) {
    var id = 'cms-anchor-' + sec.id;
    var input = el('input', { type: 'text', class: 'cms-input', id: id, maxlength: '40', autocomplete: 'off', spellcheck: 'false' });
    input.value = bridge.anchorOf(sec.id);
    input.addEventListener('change', function () {
      bridge.setAnchor(sec.id, input.value);
      input.value = bridge.anchorOf(sec.id);
      render(); // every "go to" list shows the new name
      refreshPreview();
    });
    return el('div', { class: 'cms-card cms-anchor-card' }, [
      el('div', { class: 'cms-card-head' }, [el('label', { class: 'cms-label', for: id, text: 'Link name of this section' }), el('span', { class: 'cms-type', text: 'menu links' })]),
      input,
      el('p', { class: 'cms-hint', text: 'A menu link written as #' + (input.value || 'name') + ' scrolls here. Letters, numbers and dashes; leave it empty for the automatic name.' })
    ]);
  }

  /** The automatic menu (builder only): a header chooses between listing the sections by itself and its own items; each section chooses whether it is listed and under what text. */
  function menuCard(sec) {
    var info = bridge.menuInfo(sec.id);
    if (!info) return null;
    if (info.kind === 'header') {
      var mode = el('select', { class: 'cms-input', id: 'cms-menu-mode', 'aria-label': 'Menu of this header' }, [
        el('option', { value: 'auto', text: 'Automatic: one item for each section' }),
        el('option', { value: 'manual', text: 'My own items' })
      ]);
      mode.value = info.mode;
      mode.addEventListener('change', function () { bridge.setMenu(sec.id, { menuMode: mode.value }); render(); refreshPreview(); });
      return el('div', { class: 'cms-card cms-menu-card' }, [
        el('div', { class: 'cms-card-head' }, [el('label', { class: 'cms-label', for: 'cms-menu-mode', text: 'Menu of this header' }), el('span', { class: 'cms-type', text: 'menu' })]),
        mode,
        el('p', { class: 'cms-hint', text: info.mode === 'auto'
          ? (info.items.length ? 'Shows: ' + info.items.join(', ') + '. Add, remove, move or hide a section and the menu follows. The button keeps its own link below; the menu item fields below are not used.' : 'No section to list yet: add sections after the header.')
          : 'You type each item and say where it goes (the fields below). Items with no link are left out of the finished site.' })
      ]);
    }
    var box = el('input', { type: 'checkbox', id: 'cms-menu-in' });
    box.checked = info.inMenu;
    var label = el('input', { type: 'text', class: 'cms-input', id: 'cms-menu-label', maxlength: '30', autocomplete: 'off', placeholder: info.defaultLabel, 'aria-label': 'Menu label' });
    label.value = info.label;
    box.addEventListener('change', function () { bridge.setMenu(sec.id, { inMenu: box.checked }); refreshPreview(); });
    label.addEventListener('change', function () { bridge.setMenu(sec.id, { menuLabel: label.value }); label.value = (bridge.menuInfo(sec.id) || {}).label || ''; refreshPreview(); });
    return el('div', { class: 'cms-card cms-menu-card' }, [
      el('div', { class: 'cms-card-head' }, [el('label', { class: 'cms-label', for: 'cms-menu-in', text: 'Show in the header menu' }), el('span', { class: 'cms-type', text: 'menu' })]),
      el('div', { class: 'cms-inline' }, [box, el('label', { for: 'cms-menu-label', class: 'cms-hint', text: 'Menu text' }), label]),
      el('p', { class: 'cms-hint', text: 'The header lists this section under this text. Leave the text empty to use "' + info.defaultLabel + '".' })
    ]);
  }

  /** A header can stay at the top of the screen while the page scrolls (builder only). */
  function stickyCard(sec) {
    var info = bridge.stickyInfo(sec.id);
    if (!info) return null;
    var box = el('input', { type: 'checkbox', id: 'cms-sticky' });
    box.checked = info.on;
    box.addEventListener('change', function () { bridge.setSticky(sec.id, box.checked); refreshPreview(); });
    return el('div', { class: 'cms-card cms-sticky-card' }, [
      el('div', { class: 'cms-card-head' }, [el('label', { class: 'cms-label', for: 'cms-sticky', text: 'Header stays at the top' }), el('span', { class: 'cms-type', text: 'header' })]),
      el('div', { class: 'cms-inline' }, [box, el('label', { for: 'cms-sticky', class: 'cms-hint', text: 'Keep the header visible while the page scrolls' })]),
      el('p', { class: 'cms-hint', text: 'Untick it to let the header scroll away with the page.' })
    ]);
  }

  function fieldCard(sec, f, index) {
    var file = page().file;
    var value = getVal(file, sec, f);
    var hidden = getHide(file, sec, f), moved = getMove(file, sec, f);
    var card = el('div', { class: 'cms-card' + (isEdited(file, sec, f) ? ' is-edited' : '') + (hidden ? ' is-hidden' : ''), 'data-field': f.id, 'data-index': String(index) });
    var reset = el('button', { type: 'button', class: 'cms-reset', text: 'Reset', title: 'Back to the original', on: { click: function () {
      setVal(file, sec, f, f.value); if (f.fit) setFit(file, sec, f, f.fit); setHide(file, sec, f, false); setMove(file, sec, f, 0); setShift(file, sec, f, ''); snapshot(); changed(true);
    } } });
    function place(step) { setMove(file, sec, f, moved + step); snapshot(); changed(true); }
    var canMove = typeof f.pos === 'number' && typeof f.sibs === 'number' && f.sibs > 1;
    var tools = [];
    if (canMove) {
      tools.push(el('button', { type: 'button', class: 'cms-tool cms-up', text: '\u25b2', title: 'Move up', 'aria-label': f.label + ': move up', disabled: f.pos + moved <= 0, on: { click: function () { place(-1); } } }));
      tools.push(el('button', { type: 'button', class: 'cms-tool cms-down', text: '\u25bc', title: 'Move down', 'aria-label': f.label + ': move down', disabled: f.pos + moved >= f.sibs - 1, on: { click: function () { place(1); } } }));
    }
    if (getShift(file, sec, f)) tools.unshift(el('button', { type: 'button', class: 'cms-tool cms-putback', text: 'Put back', title: 'Back to the place the page gives it', on: { click: function () { setShift(file, sec, f, ''); snapshot(); changed(true); } } }));
    tools.push(el('button', { type: 'button', class: 'cms-tool cms-hide', text: hidden ? 'Show again' : 'Hide', title: hidden ? 'Show it on the page again' : 'Take it off the page (you can show it again)', 'aria-pressed': hidden ? 'true' : 'false', on: { click: function () { setHide(file, sec, f, !hidden); snapshot(); changed(true); } } }));
    function syncReset() { reset.hidden = !isEdited(file, sec, f); }
    card.appendChild(el('div', { class: 'cms-card-head' }, [
      el('label', { class: 'cms-label', text: f.label }),
      el('div', { class: 'cms-card-actions' }, tools.concat([reset, el('span', { class: 'cms-type', text: f.type })]))
    ]));
    var orig = originalOf(sec, f);
    if (orig) card.appendChild(el('p', { class: 'cms-hint cms-orig', text: 'In ' + langName(allLangs()[0]) + ': ' + (orig.length > 200 ? orig.slice(0, 200) + '\u2026' : orig) }));
    function commit(v) { setVal(file, sec, f, v); syncReset(); edited(); }

    if (f.type === 'image') {
      var thumb = el('img', { class: 'cms-thumb', alt: '' });
      var fitBox = null;
      function paintThumb(v) { var u = safeUrl(v, 'image'); if (u) thumb.src = u; else thumb.removeAttribute('src'); if (fitBox) fitBox.repaint(u || f.value); }
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
      if (f.fit) { fitBox = fitEditor(sec, f, function () { return getVal(file, sec, f); }, function () { syncReset(); edited(); }); card.appendChild(fitBox); }
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
      var link = el('input', { type: 'text', class: 'cms-input', autocomplete: 'off', placeholder: 'https://… or choose above', 'aria-label': f.label });
      link.value = value;
      var tg = linkTargets();
      var pick = null;
      if (tg.sections.length || tg.pages.length) {
        pick = el('select', { class: 'cms-input cms-pick', 'aria-label': f.label + ': go to a section or page' });
        pick.appendChild(el('option', { value: '', text: 'Go to a section or page…' }));
        [['A section on this page', tg.sections], ['Another page of this site', tg.pages]].forEach(function (g) {
          if (!g[1].length) return;
          var og = el('optgroup', { label: g[0] });
          g[1].forEach(function (t) { og.appendChild(el('option', { value: t.value, text: t.label })); });
          pick.appendChild(og);
        });
        pick.addEventListener('change', function () {
          if (!pick.value) return;
          link.value = pick.value;
          link.setAttribute('aria-invalid', 'false');
          commit(pick.value);
        });
        card.appendChild(pick);
      }
      function syncPick() { if (!pick) return; pick.value = ''; pick.value = link.value; if (pick.selectedIndex < 0) pick.value = ''; }
      syncPick();
      link.addEventListener('input', function () {
        var clean = safeUrl(link.value, 'link');
        link.setAttribute('aria-invalid', clean || !link.value.trim() ? 'false' : 'true');
        syncPick();
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
    if (inBuilder && bridge.anchorOf && bridge.setAnchor && !q && bridge.anchorOf(sec.id)) ed.appendChild(anchorCard(sec));
    if (inBuilder && bridge.stickyInfo && bridge.setSticky && !q) { var sc = stickyCard(sec); if (sc) ed.appendChild(sc); }
    if (inBuilder && bridge.menuInfo && bridge.setMenu && !q) { var mc = menuCard(sec); if (mc) ed.appendChild(mc); }
    sec.fields.forEach(function (f, i) {
      if (q && (f.label + ' ' + getVal(page().file, sec, f)).toLowerCase().indexOf(q) < 0) return;
      ed.appendChild(fieldCard(sec, f, i));
      shown++;
    });
    // a form block also carries the one site-wide choice of where its messages go
    if (sec.form && hasForms() && (!q || 'form messages where send go'.indexOf(q) >= 0)) { ed.appendChild(formPanel(true)); shown++; }
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
    if (inBuilder) { syncBuilder(); if (hasForms()) syncForm(); bridge.close(); return true; }
    if (hasForms() && formProblem()) { toast('Fix the form messages setting first: ' + formProblem()); return false; }
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
          var fv = rs[f.id + '__fit'];
          if (f.type === 'image' && f.fit && typeof fv === 'string' && fv !== f.fit && /^(cover|contain)[|0-9]{0,16}$/.test(fv)) {
            out[p.file] = out[p.file] || {}; out[p.file][sec.id] = out[p.file][sec.id] || {};
            out[p.file][sec.id][f.id + '__fit'] = fv; kept++;
          }
          if (rs[f.id + '__hide'] === '1') { out[p.file] = out[p.file] || {}; out[p.file][sec.id] = out[p.file][sec.id] || {}; out[p.file][sec.id][f.id + '__hide'] = '1'; kept++; }
          var shv = rs[f.id + '__shift'];
          if (typeof shv === 'string' && SHIFT_RE.test(shv)) { out[p.file] = out[p.file] || {}; out[p.file][sec.id] = out[p.file][sec.id] || {}; out[p.file][sec.id][f.id + '__shift'] = shv; kept++; }
          var mv = rs[f.id + '__move'];
          if (typeof mv === 'string' && /^-?[1-9][0-9]?$/.test(mv)) { out[p.file] = out[p.file] || {}; out[p.file][sec.id] = out[p.file][sec.id] || {}; out[p.file][sec.id][f.id + '__move'] = mv; kept++; }
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
    var rf = raw.__form;
    if (hasForms() && rf && typeof rf === 'object' && typeof rf.method === 'string') {
      var rr = R.check(rf.method, rf.target), dd = formDefault();
      if (rr.ok && (rr.method !== dd.method || rr.value !== dd.target)) { out.__form = { method: rr.method, target: rr.value }; kept++; }
    }
    var rl = raw.__langs;
    if (hasLangs() && Array.isArray(rl)) {
      var all = allLangs(), kl = all.filter(function (l, i) { return i === 0 || rl.indexOf(l) >= 0; });
      if (kl.length !== all.length) { out.__langs = kl; kept++; }
    }
    return { values: out, kept: kept };
  }

  /* ---------------- form messages ---------------- */
  /** The card with the choice and its value. `inSection`: shown under a form block's own fields (same single setting for the site). */
  function formPanel(inSection) {
    var f = getForm();
    var m = R.method(f.method);
    var valueInput = el('input', { type: 'text', class: 'cms-input', id: 'cms-form-target', maxlength: '400', autocomplete: 'off', value: f.target, placeholder: m.placeholder });
    var valueLabel = el('label', { class: 'cms-label', for: 'cms-form-target', text: m.valueLabel });
    var valueWrap = el('div', { class: 'cms-card-body', hidden: !m.valueLabel }, [valueLabel, valueInput]);
    var hint = el('p', { class: 'cms-hint', id: 'cms-form-hint' });
    var via = el('p', { class: 'cms-hint', id: 'cms-form-via' });
    var select = el('select', { class: 'cms-input', id: 'cms-form-method' }, R.METHODS.map(function (o) { return el('option', { value: o.id, text: o.label }); }));
    select.value = f.method;
    function paint() {
      var cur = getForm(), mm = R.method(cur.method), r = R.check(cur.method, cur.target);
      var typed = cur.target.trim();
      valueWrap.hidden = !mm.valueLabel;
      valueLabel.textContent = mm.valueLabel;
      valueInput.placeholder = mm.placeholder;
      valueInput.setAttribute('aria-invalid', !r.ok && typed ? 'true' : 'false');
      var showError = !r.ok && (typed || !mm.valueLabel);
      hint.textContent = showError ? r.error : mm.hint;
      hint.setAttribute('role', showError ? 'alert' : 'note');
      hint.classList.toggle('cms-error', !!showError);
      // who gets to see the messages on the way: the client should say so in their privacy notice
      via.textContent = mm.via ? 'Messages pass through ' + mm.via + '. Mention this in your privacy notice.' : (mm.id === 'mailto' ? 'Messages go from the visitor\u2019s own mail program straight to you; no service sits in between.' : '');
      via.hidden = !via.textContent;
    }
    select.addEventListener('change', function () {
      setForm(select.value, R.method(select.value).valueLabel ? getForm().target : '');
      valueInput.value = getForm().target;
      paint(); edited();
    });
    valueInput.addEventListener('input', function () { setForm(getForm().method, valueInput.value); paint(); edited(); });
    var panel = el('div', { class: 'cms-panel', id: 'cms-form-panel' }, [
      el('h2', { text: inSection ? 'Where should this form\u2019s messages go?' : 'Where should form messages go?' }),
      el('p', { class: 'cms-hint', text: 'Every contact, newsletter, waiting-list and quote form on the site uses this one choice. ' + (inBuilder ? 'It is saved to your page as you type.' : 'Press Publish, then download cms-content.js and upload it to change the live site.') }),
      el('label', { class: 'cms-label', for: 'cms-form-method', text: 'Send messages' }), select,
      valueWrap, hint, via,
      el('p', { class: 'cms-hint', text: 'Netlify Forms only works when the site is hosted on Netlify. The preview never sends anything; messages are sent from the live site.' })
    ]);
    paint();
    return panel;
  }
  /** The Languages tab: one tick per language the site offers, and how much of each is still the original wording. */
  function renderBuilderLangs(bl) {
    var ed = $('cms-editor');
    var say = el('p', { class: 'cms-hint', role: 'status' });
    var rows = bl.langs.map(function (l) {
      var open = l.here ? el('span', { class: 'cms-hint', text: 'Editing this one' }) : el('button', { type: 'button', class: 'cms-btn cms-btn-ghost cms-btn-sm', text: 'Translate', on: { click: function () { leaveFor(function () { bridge.switchLanguage(l.code); }); } } });
      var row = el('div', { class: 'cms-lang-row' }, [el('span', { class: 'cms-lang-name' }, [el('span', { text: l.name })]), el('span', { class: 'cms-hint', text: l.site ? 'Main language' : '' }), open]);
      if (l.site || !bridge.removeLanguage) return row;
      // the main language stays; any other can go, after one question (its pages and words are deleted; Undo in the builder brings them back)
      var remove = el('button', { type: 'button', class: 'cms-btn cms-btn-ghost cms-btn-sm', text: 'Remove', 'aria-label': 'Remove ' + l.name });
      remove.addEventListener('click', function () {
        row.textContent = '';
        var yes = el('button', { type: 'button', class: 'cms-btn cms-btn-primary cms-btn-sm', text: 'Yes, remove it' });
        var keep = el('button', { type: 'button', class: 'cms-btn cms-btn-ghost cms-btn-sm', text: 'Keep it' });
        keep.addEventListener('click', function () { render(); });
        yes.addEventListener('click', function () { var why = leaveFor(function () { return bridge.removeLanguage(l.code); }); if (why) say.textContent = why; });
        [el('span', { class: 'cms-lang-name', text: 'Remove ' + l.name + ' and all its pages and words?' }), yes, keep].forEach(function (n) { row.appendChild(n); });
      });
      row.appendChild(remove);
      return row;
    });
    var sel = el('select', { class: 'cms-input', id: 'cms-lang-add', 'aria-label': 'Language to add' }, [el('option', { value: '', text: 'Choose a language' })].concat(bl.free.map(function (f) { return el('option', { value: f.code, text: f.label }); })));
    var add = el('button', { type: 'button', class: 'cms-btn cms-btn-primary cms-btn-sm', text: 'Add language', on: { click: function () {
      if (!sel.value) { say.textContent = 'Choose a language first.'; return; }
      var why = leaveFor(function () { return bridge.addLanguage(sel.value); });
      if (why) say.textContent = why;
    } } });
    ed.appendChild(el('div', { class: 'cms-panel', id: 'cms-lang-panel' }, [
      el('h2', { text: 'Languages of the website' }),
      el('p', { class: 'cms-hint', text: bl.langs.length > 1 ? 'Pick a language and press Translate to write its words. Every language has its own copy of every page.' : 'The website is in one language. Add a language to get a copy of every page to translate; a language switcher is added at the top of each page.' }),
      el('div', { class: 'cms-lang-list' }, rows),
      el('label', { class: 'cms-label', for: 'cms-lang-add', text: 'Add a language (a copy of all ' + bl.pages + (bl.pages === 1 ? ' page' : ' pages') + ')' }),
      el('div', { class: 'cms-inline' }, [sel, add]), say
    ]));
  }
  function renderLangs() {
    var bl = builderLangs();
    if (bl) { renderBuilderLangs(bl); return; }
    var ed = $('cms-editor'), all = allLangs(), on = getLangs();
    var count = el('p', { class: 'cms-hint', role: 'status' });
    function paintCount() { var n = getLangs().length; count.textContent = n + ' of ' + all.length + (all.length === 1 ? ' language is' : ' languages are') + ' on. ' + (n === 1 ? 'With one language the language switcher is hidden.' : ''); }
    var rows = all.map(function (code, i) {
      var id = 'cms-lang-' + code;
      var box = el('input', { type: 'checkbox', id: id });
      box.checked = on.indexOf(code) >= 0;
      box.disabled = i === 0;
      box.addEventListener('change', function () {
        setLangs(all.filter(function (l, j) { return j === 0 || (l === code ? box.checked : getLangs().indexOf(l) >= 0); }));
        paintCount(); snapshot(); changed(false);
      });
      var u = i === 0 ? null : untranslated(code);
      var status = i === 0 ? 'Main language' : (u[1] ? (u[0] ? u[0] + ' of ' + u[1] + ' texts are still the original wording' : 'All ' + u[1] + ' texts are translated') : '');
      var open = i === 0 ? null : el('button', { type: 'button', class: 'cms-btn cms-btn-ghost cms-btn-sm', text: 'Translate', on: { click: function () { switchLanguage(code); } } });
      return el('div', { class: 'cms-lang-row' }, [
        el('label', { class: 'cms-lang-name', for: id }, [box, el('span', { text: langName(code) })]),
        el('span', { class: 'cms-hint', text: status }), open
      ]);
    });
    paintCount();
    ed.appendChild(el('div', { class: 'cms-panel', id: 'cms-lang-panel' }, [
      el('h2', { text: 'Languages of the website' }),
      el('p', { class: 'cms-hint', text: 'Tick the languages visitors can choose in the language switcher. Use Translate (or the Language list on the left) to write the words of a language. A language that is not listed here is added in the builder; export again afterwards.' }),
      el('div', { class: 'cms-lang-list' }, rows), count,
      el('p', { class: 'cms-hint', text: inBuilder ? '' : 'Press Publish, then download cms-content.js and upload it to change the live site. A language that is off stays on the server but is not offered in the switcher.' })
    ]));
  }
  function renderForms() { $('cms-editor').appendChild(formPanel(false)); }

  function renderBackup() {
    var ed = $('cms-editor');
    var total = 0;
    C.pages.forEach(function (p) { p.sections.forEach(function (s) { total += editedCount(p.file, s); }); });
    if (draft.__form) total++;
    if (draft.__langs) total++;
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
    $('cms-search').hidden = tab === BACKUP_TAB || tab === FORM_TAB || tab === LANG_TAB;
    if (tab === BACKUP_TAB) { title.textContent = 'Publishing & backup'; renderBackup(); }
    else if (tab === FORM_TAB) { title.textContent = 'Form messages'; renderForms(); }
    else if (tab === LANG_TAB) { title.textContent = 'Languages'; renderLangs(); }
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
  var langSelect = $('cms-lang-select');
  /** Fills the Page list with the pages of the current language (all pages when the site has one language). */
  function fillPages() {
    pageSelect.textContent = '';
    C.pages.forEach(function (p, i) { if (!hasLangs() || langOf(p) === langOf(page())) pageSelect.appendChild(el('option', { value: String(i), text: p.title })); });
    pageSelect.value = String(pageIndex);
    $('cms-page-pick').hidden = pageSelect.options.length < 2;
  }
  /** Opens the page of language `code` that goes with the open page (or that language's first page). */
  function switchLanguage(code) {
    var cur = page(), target = -1;
    C.pages.forEach(function (p, i) { if (target < 0 && langOf(p) === code && cur.group && p.group === cur.group) target = i; });
    C.pages.forEach(function (p, i) { if (target < 0 && langOf(p) === code) target = i; });
    if (target < 0) return;
    pageIndex = target;
    langSelect.value = code;
    fillPages();
    tab = sections()[0] ? sections()[0].id : BACKUP_TAB;
    render(); loadPreview();
  }
  if (hasLangs()) {
    $('cms-lang-pick').hidden = false;
    allLangs().forEach(function (l) { langSelect.appendChild(el('option', { value: l, text: langName(l) })); });
    langSelect.value = langOf(page());
    langSelect.addEventListener('change', function () { switchLanguage(langSelect.value); });
  }
  var bl0 = builderLangs();
  $('cms-nav-langs').hidden = !hasLangs() && !bl0;
  // the language switcher block in this panel's preview lists the project's languages and opens the page of the one chosen
  if (bl0) window.__edvLangs = {
    list: function () { var b = builderLangs(); return b ? b.langs.map(function (l) { return { code: l.code, name: l.name, here: l.here }; }) : []; },
    open: function (code) { leaveFor(function () { bridge.switchLanguage(code); }); }
  };
  if (bl0 && bl0.langs.length > 1) {
    $('cms-lang-pick').hidden = false;
    bl0.langs.forEach(function (l) { langSelect.appendChild(el('option', { value: l.code, text: l.name })); });
    langSelect.value = bl0.langs.filter(function (l) { return l.here; }).map(function (l) { return l.code; })[0] || '';
    langSelect.addEventListener('change', function () { leaveFor(function () { bridge.switchLanguage(langSelect.value); }); });
  }
  fillPages();
  pageSelect.addEventListener('change', function () {
    pageIndex = +pageSelect.value;
    tab = sections()[0] ? sections()[0].id : BACKUP_TAB;
    render(); loadPreview();
  });
  $('cms-view-site').setAttribute('href', page().file);
  $('cms-nav-forms').hidden = !hasForms();
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
  $('cms-nav-forms').addEventListener('click', function () { tab = FORM_TAB; render(); });
  $('cms-nav-langs').addEventListener('click', function () { tab = LANG_TAB; render(); });
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
