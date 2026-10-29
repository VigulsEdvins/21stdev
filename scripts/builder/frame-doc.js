/**
 * Puts a page into a preview iframe without `srcdoc` (plan E16.7, step 3 of docs/security/builder-csp.md).
 * A `srcdoc` frame inherits the Content-Security-Policy of the builder page, so the builder page could never be strict: the preview
 * needs inline scripts and styles. A frame loaded from its own address (preview-frame.html) has its own policy, sent with that file
 * (see site/_headers), and keeps it when the page is written into it with document.open/write/close. The frame stays on our own
 * origin, so the canvas editing code still reaches into it exactly as before.
 *
 * Every update starts from a fresh window, as `srcdoc` did: the frame goes back to the blank page and the new page is written into that.
 * (document.open alone would keep the old window, so timers, listeners and globals of the previous page would live on.)
 * The load event of the blank page is swallowed and a load event is sent when the written page has loaded, so listeners on the frame
 * see exactly one load per page, as they did with srcdoc.
 */
(function () {
  'use strict';
  const FRAME_URL = 'preview-frame.html';

  // document.open() gives the document the address of the page that called it, so once a page is written the address no longer says
  // that the window is blank: remember that instead.
  const used = new WeakSet(); // frames whose current window already holds a written page

  function blankReady(iframe) {
    try {
      return !used.has(iframe) && !!iframe.contentWindow && iframe.contentWindow.location.href.indexOf(FRAME_URL) !== -1 && !!iframe.contentDocument && iframe.contentDocument.readyState !== 'loading';
    } catch (_) { return false; }
  }

  const waiting = new WeakMap(); // frame -> { html, done: [resolve, reject] }: a page is on its way; a newer page replaces it

  function put(iframe, html) {
    const d = iframe.contentDocument, w = iframe.contentWindow;
    d.open(); d.write(html); d.close(); used.add(iframe);
    // a written page does not fire the frame's own load event, and the builder wires the canvas on that event: send it when the page has loaded
    const announce = function () { iframe.dispatchEvent(new Event('load')); };
    if (d.readyState === 'complete') setTimeout(announce, 0); else w.addEventListener('load', announce, { once: true });
  }

  /** Resolves once `html` has been written into a fresh window of the frame (its own scripts may still be loading). The newest call wins. */
  function write(iframe, html) {
    return new Promise(function (resolve, reject) {
      const queued = waiting.get(iframe);
      if (queued) { queued.html = html; queued.done.push([resolve, reject]); return; } // the blank page is on its way: it will get the newest html
      if (blankReady(iframe)) { try { put(iframe, html); resolve(); } catch (e) { reject(e); } return; }
      const job = { html, done: [[resolve, reject]] };
      waiting.set(iframe, job);
      const onLoad = function (ev) {
        if (!blankReady(iframe)) return;
        iframe.removeEventListener('load', onLoad, true);
        ev.stopImmediatePropagation(); // the blank page is not news to anyone else
        waiting.delete(iframe);
        try { put(iframe, job.html); job.done.forEach(function (p) { p[0](); }); } catch (e) { job.done.forEach(function (p) { p[1](e); }); }
      };
      iframe.addEventListener('load', onLoad, true); // capture: runs before the listeners other code put on the frame
      // a window that already holds a written page is replaced by a blank one; a frame still loading its first page is just waited for
      // (navigating it again would race with that first load and could wipe the page after it is written)
      const hadPage = used.has(iframe);
      used.delete(iframe);
      let navigated = false;
      if (hadPage) { try { iframe.contentWindow.location.replace(FRAME_URL); navigated = true; } catch (_) { /* fall through */ } }
      if (!navigated && !iframe.getAttribute('src')) iframe.setAttribute('src', FRAME_URL);
    });
  }

  const api = { write, FRAME_URL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.FrameDoc = api;
})();
