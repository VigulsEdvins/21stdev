/**
 * Draws an emoji favicon into PNG files with the browser's own canvas (no image library): the apple-touch icon
 * and the two manifest sizes. Returns { 'apple-touch-icon.png': Uint8Array, ... }; empty outside a browser.
 */
(function () {
  'use strict';

  const SIZES = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };

  async function renderEmojiIcons(emoji, doc = typeof document !== 'undefined' ? document : null) {
    const out = {};
    if (!doc || !emoji) return out;
    for (const [name, size] of Object.entries(SIZES)) {
      const canvas = doc.createElement('canvas');
      canvas.width = canvas.height = size;
      const g = canvas.getContext('2d');
      if (!g) return {};
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `${Math.round(size * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.fillText(emoji, size / 2, size / 2 + size * 0.04);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      if (!blob) return {};
      out[name] = new Uint8Array(await blob.arrayBuffer());
    }
    return out;
  }

  /** The emoji of a page's favicon setting, or '' when it is an image address or empty. */
  function emojiOf(page) {
    const fav = ((page && page.favicon) || '').trim();
    if (!fav || (/^(https?:|data:|\/|\.\/|[\w-]+\/)/i.test(fav) && !/^\p{Extended_Pictographic}/u.test(fav))) return '';
    return fav;
  }

  const api = { renderEmojiIcons, emojiOf, SIZES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.FaviconPng = api;
})();
