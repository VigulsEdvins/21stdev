/**
 * JSZip is only needed when someone downloads, so it is not loaded with the page (it was 98 KB that blocked the first paint,
 * plan E6.12). `await window.loadJsZip()` before the first use; it is fetched once, from our own origin. If it cannot be
 * fetched the callers fall back to the built-in zip writer (`Assembler.createZipArchive`), as they always could.
 */
(function () {
  'use strict';
  let pending = null;
  window.loadJsZip = function loadJsZip() {
    if (typeof window.JSZip !== 'undefined') return Promise.resolve(window.JSZip);
    if (!pending) {
      pending = new Promise(function (resolve) {
        const s = document.createElement('script');
        s.src = 'scripts/vendor/jszip.min.js';
        s.onload = function () { resolve(window.JSZip); };
        s.onerror = function () { pending = null; resolve(undefined); };
        document.head.appendChild(s);
      });
    }
    return pending;
  };
})();
