// Tiny wireframe pictures for the block cards: <span class="wire" data-kind="banner"></span>
(function () {
  var R = function (x, y, w, h, f) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="1.5" ' + (f ? 'fill="currentColor" opacity=".85"' : 'fill="none" stroke="currentColor" stroke-width="1.4" opacity=".7"') + '/>'; };
  var K = {
    banner: R(4, 4, 72, 48) + R(12, 16, 38, 6, 1) + R(12, 27, 28, 3, 1) + R(12, 34, 16, 6, 1),
    about: R(4, 6, 26, 40) + R(36, 8, 38, 5, 1) + R(36, 18, 38, 3, 1) + R(36, 25, 38, 3, 1) + R(36, 32, 28, 3, 1),
    services: R(4, 10, 20, 34) + R(30, 10, 20, 34) + R(56, 10, 20, 34) + R(8, 16, 12, 5, 1) + R(34, 16, 12, 5, 1) + R(60, 16, 12, 5, 1),
    prices: R(4, 12, 22, 34) + R(29, 6, 22, 44) + R(54, 12, 22, 34) + R(34, 14, 12, 5, 1),
    gallery: R(4, 6, 34, 26) + R(42, 6, 34, 14) + R(42, 24, 34, 8) + R(4, 36, 22, 14) + R(30, 36, 46, 14),
    reviews: R(4, 8, 72, 14) + R(4, 26, 72, 14) + R(10, 12, 24, 3, 1) + R(10, 30, 30, 3, 1),
    faq: R(4, 6, 72, 10) + R(4, 20, 72, 10) + R(4, 34, 72, 10) + R(66, 9, 6, 4, 1) + R(66, 23, 6, 4, 1),
    form: R(10, 6, 60, 8) + R(10, 18, 60, 8) + R(10, 30, 60, 10) + R(10, 44, 22, 7, 1),
    map: R(4, 4, 72, 48) + '<path d="M4 38 L26 24 L44 34 L76 14" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".7"/>' + '<circle cx="42" cy="26" r="4" fill="currentColor"/>',
    newsletter: R(4, 14, 72, 28) + R(10, 22, 40, 6) + R(54, 22, 16, 6, 1),
    team: '<circle cx="18" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="40" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="62" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>' + R(8, 36, 20, 3, 1) + R(30, 36, 20, 3, 1) + R(52, 36, 20, 3, 1),
    process: R(4, 20, 14, 14) + R(33, 20, 14, 14) + R(62, 20, 14, 14) + '<path d="M18 27h15M47 27h15" stroke="currentColor" stroke-width="1.4" opacity=".7"/>'
  };
  document.querySelectorAll('.wire').forEach(function (el) {
    el.innerHTML = '<svg viewBox="0 0 80 56" width="80" height="56" aria-hidden="true">' + (K[el.getAttribute('data-kind')] || '') + '</svg>';
  });
})();
