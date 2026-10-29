/**
 * The guided block picker (plan E6.3): "Your page" (the blocks in order, with move, another look and remove) and
 * "Add a block" (the twelve everyday kinds with a one-line explanation). It only drives the stack manager, so the
 * canvas, history and export see the same changes as from the classic catalogue, which stays for Advanced mode.
 * Built with DOM calls only; every name shown comes from block-kinds.js or from the section's own title.
 */
(function () {
  'use strict';

  const Kinds = (typeof window !== 'undefined' && window.BuilderBlockKinds) || require('./block-kinds.js');

  function el(doc, tag, attrs, ...kids) {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
    kids.forEach((k) => e.append(k));
    return e;
  }

  function init(sm, doc = document, slot) {
    const host = slot || doc.getElementById('paneElements');
    if (!host || !sm || doc.getElementById('blockPicker')) return null;

    const yourList = el(doc, 'ol', { class: 'bp-list', id: 'bpYourPage' });
    const empty = el(doc, 'p', { class: 'bp-empty', id: 'bpEmpty', text: 'Nothing here yet. Add your first block below.' });
    const addList = el(doc, 'ul', { class: 'bp-kinds', id: 'bpKinds' });
    const startOver = el(doc, 'button', { type: 'button', class: 'bp-btn bp-over', id: 'bpStartOver', text: 'Start over' });
    const sure = el(doc, 'span', { class: 'bp-sure', id: 'bpSure', hidden: '' }, el(doc, 'span', { text: 'Clear every block? You can undo it. ' }),
      el(doc, 'button', { type: 'button', class: 'bp-btn', id: 'bpOverYes', text: 'Yes, clear it' }), el(doc, 'button', { type: 'button', class: 'bp-btn', id: 'bpOverNo', text: 'Keep my page' }));
    const live = el(doc, 'p', { class: 'bp-live', id: 'bpLive', role: 'status', 'aria-live': 'polite' });
    const root = el(doc, 'section', { class: 'block-picker', id: 'blockPicker', 'aria-label': 'Blocks of your page' },
      el(doc, 'h3', { class: 'bp-h', text: 'Your page' }), empty, yourList,
      el(doc, 'h3', { class: 'bp-h', text: 'Add a block' }), addList, el(doc, 'div', { class: 'bp-over-row' }, startOver, sure), live);
    host.insertBefore(root, host.firstChild);

    startOver.addEventListener('click', () => { startOver.hidden = true; sure.hidden = false; doc.getElementById('bpOverNo').focus(); });
    doc.getElementById('bpOverNo').addEventListener('click', () => { sure.hidden = true; startOver.hidden = false; startOver.focus(); });
    doc.getElementById('bpOverYes').addEventListener('click', () => {
      const api = (doc.defaultView || window).builderPreview; // one history step, so one Undo brings the page back
      if (api && api.serializeState && api.applyState) { const snap = api.serializeState(); snap.stack = []; api.applyState(snap); } else sm.clearStack();
      sure.hidden = true; startOver.hidden = false; say('Your page is empty. Undo brings it back.');
    });
    const say = (t) => { live.textContent = t; };
    const stack = () => (sm.getState().stack || []);
    const nameOf = (s) => { const k = Kinds.kindOf(s.slug); return k ? k.label : (s.title || s.slug); };

    function btn(cls, text, label, onClick, disabled) {
      const b = el(doc, 'button', { type: 'button', class: 'bp-btn ' + cls, 'aria-label': label, text });
      if (disabled) b.disabled = true;
      b.addEventListener('click', onClick);
      return b;
    }

    function scroller(node) {
      for (let n = node.parentElement; n; n = n.parentElement) { const o = (doc.defaultView || window).getComputedStyle(n).overflowY; if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n; }
      return doc.scrollingElement || doc.documentElement;
    }

    /**
     * Drag to reorder with a finger or a mouse (pointer events, so one code path): hold the handle, move, let go. The other blocks slide out of
     * the way, the list scrolls when the finger nears an edge, and the move is made once, on release, as one history step. The arrows stay for
     * keyboards and screen readers; Escape or a cancelled touch puts everything back.
     */
    function enableDrag(handle, li, s, name) {
      handle.addEventListener('pointerdown', (e) => {
        if (e.button > 0 || handle.disabled) return;
        e.preventDefault();
        const win = doc.defaultView || window, box = scroller(li), lis = Array.from(yourList.children), from = lis.indexOf(li);
        const base = lis.map((x) => { const r = x.getBoundingClientRect(); return { mid: r.top + r.height / 2 + box.scrollTop, h: r.height }; });
        const step = base[from].h + 8; // block height plus the grid gap
        const startY = e.clientY + box.scrollTop;
        let y = e.clientY, to = from, raf = 0, done = false;
        try { handle.setPointerCapture(e.pointerId); } catch (_) { /* the handle still gets the events it needs */ }
        li.classList.add('is-dragging'); yourList.classList.add('is-sorting');
        const place = () => {
          if (done) return;
          const edge = 56, r = box === doc.scrollingElement || box === doc.documentElement ? { top: 0, bottom: win.innerHeight } : box.getBoundingClientRect();
          if (y < r.top + edge) box.scrollTop -= 12; else if (y > r.bottom - edge) box.scrollTop += 12;
          const dy = y + box.scrollTop - startY, centre = base[from].mid + dy;
          to = base.filter((b, k) => k !== from && b.mid < centre).length; // the place among the others, by where the dragged block's middle is
          li.style.transform = 'translateY(' + dy + 'px)'; li.setAttribute('data-drop-at', String(to + 1)); // the place it would take now
          lis.forEach((x, i) => { if (x === li) return; x.style.transform = (from < to && i > from && i <= to) ? 'translateY(' + -step + 'px)' : (from > to && i >= to && i < from) ? 'translateY(' + step + 'px)' : ''; });
          raf = win.requestAnimationFrame(place);
        };
        const finish = (apply) => {
          if (done) return; done = true; win.cancelAnimationFrame(raf);
          handle.removeEventListener('pointermove', onMove); handle.removeEventListener('pointerup', onUp); handle.removeEventListener('pointercancel', onCancel); doc.removeEventListener('keydown', onKey);
          li.classList.remove('is-dragging'); yourList.classList.remove('is-sorting');
          lis.forEach((x) => { x.style.transform = ''; });
          if (apply && to !== from) { sm.moveSection(s.id, to - from); say(name + ' moved to place ' + (to + 1) + ' of ' + lis.length); }
        };
        const onMove = (ev) => { y = ev.clientY; };
        const onUp = () => finish(true), onCancel = () => finish(false), onKey = (ev) => { if (ev.key === 'Escape') finish(false); };
        handle.addEventListener('pointermove', onMove); handle.addEventListener('pointerup', onUp); handle.addEventListener('pointercancel', onCancel); doc.addEventListener('keydown', onKey);
        place();
      });
    }

    function render() {
      const items = stack();
      empty.hidden = items.length > 0;
      startOver.disabled = items.length === 0;
      yourList.replaceChildren();
      items.forEach((s, i) => {
        const kind = Kinds.kindOf(s.slug), name = nameOf(s), locked = !!s.locked;
        const li = el(doc, 'li', { class: 'bp-item', 'data-id': String(s.id), 'data-slug': String(s.slug) });
        li.append(el(doc, 'span', { class: 'bp-name', text: name }));
        const tools = el(doc, 'span', { class: 'bp-tools' });
        const grip = btn('bp-drag', '⠿', 'Drag ' + name + ' to a new place, or use the arrows', () => {}, locked);
        grip.setAttribute('title', 'Hold and drag to move');
        enableDrag(grip, li, s, name);
        tools.append(grip,
          btn('bp-up', '↑', 'Move ' + name + ' up', () => { sm.moveSection(s.id, -1); say(name + ' moved up'); }, locked || i === 0),
          btn('bp-down', '↓', 'Move ' + name + ' down', () => { sm.moveSection(s.id, 1); say(name + ' moved down'); }, locked || i === items.length - 1));
        if (kind && kind.variants.length > 1) {
          tools.append(btn('bp-look', 'Another look', 'Show another look for ' + name, () => {
            const next = Kinds.nextVariant(kind.id, s.slug);
            const access = (doc.defaultView || window).BuilderAccess;
            if (next && access && access.locked(next)) { access.prompt('More looks for ' + name); say('More looks need a free account.'); return; }
            if (next && sm.replaceSection(s.id, next, { title: kind.label })) say(name + ' has a new look');
          }, locked));
        }
        tools.append(btn('bp-remove', 'Remove', 'Remove ' + name, () => { sm.removeSection(s.id); say(name + ' removed'); }, locked));
        li.append(tools);
        yourList.append(li);
      });

      addList.replaceChildren();
      Kinds.KINDS.forEach((k) => {
        const has = items.some((s) => (Kinds.kindOf(s.slug) || {}).id === k.id);
        const ready = k.variants.length > 0;
        const li = el(doc, 'li', { class: 'bp-kind' + (has ? ' is-added' : '') + (ready ? '' : ' is-later'), 'data-kind': k.id });
        const text = el(doc, 'span', { class: 'bp-kind-text' }, el(doc, 'b', { text: k.label }), el(doc, 'small', { text: ready ? k.about : 'Not ready yet. Ask edvlabs to add it for you.' }));
        const label = has ? k.label + ' is on your page' : 'Add ' + k.label;
        const b = btn('bp-add', has ? 'Added' : 'Add', label, () => {
          sm.addSection(k.variants[0], { title: k.label });
          say(k.label + ' added to your page');
        }, has || !ready);
        li.append(text, b);
        addList.append(li);
      });
    }

    sm.subscribe(render);
    render();
    return { render, root };
  }

  const api = { init };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderBlockPicker = api;
    let tries = 0;
    const start = () => {
      const sm = window.builderManager;
      if (sm) { window.builderBlockPicker = init(sm, document); return; }
      if (++tries < 100) setTimeout(start, 50);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
