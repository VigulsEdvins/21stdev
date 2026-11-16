/* Colour combinations for the preview's booking form, measured from the page it sits on (runs in the browser; inlined by make-preview.js, also run by form-palettes.js for the report).
   Colour theory used (sources and the full list per template: docs/design/form-colour-combinations.html):
   - A template's own colours were chosen to go together, so the panel only ever uses them: one of the template's colours as it is ("palette"),
     or a deeper / lighter tone of one of its colours ("tone": monochromatic, the safest harmony; pastels only get lighter tints, since a pastel pushed dark
     becomes another colour: peach turns brown, and any orange or yellow (hue 25-80) turns brown or olive). A colour the template does not use is never taken
     (a charcoal from a photo frame next to a plum page is what clashed).
   - The panel is a secondary colour (~30% in the 60-30-10 rule); the accent (~10%: button, progress, ticks) is another of the template's colours,
     and that is where contrasting hues (complementary, split-complementary, triadic) belong.
   - The panel follows the page's tonal key (60-30-10): on a mostly light, pastel page it is light; it is dark only where the page itself is largely dark.
     A new deeper or lighter tone is only allowed at a lightness that covers at least 20% of the page.
   - The panel must differ from the band right above and below it (else the sections merge); a tone of the neighbour's own hue is preferred, so the page flows.
   - Text on the panel 7:1, accent against the panel 3:1, text on the accent 4.5:1 (WCAG).
   pfPick(section[, { prev, next }]) returns { palette, inks, key, prev, next, combos: [{ bg, fg, hl, on, kind, from, harmony, accent, score, fit, dark, cr }], lib }, best first;
   combos can be empty. The page passes only the form; the report (form-palettes.js) passes other neighbours to ask what may stand between any two bands of the page. */
function pfPick(s, nb) {
  var px = function (c) { var m = c && c.match(/[\d.]+/g); return m && m.length > 2 && (m.length < 4 || +m[3] > 0.9) ? [+m[0], +m[1], +m[2]] : null; };
  var L = function (c) { var a = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
  var cr = function (a, b) { var x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  var hsl = function (c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, x = Math.max(r, g, b), n = Math.min(r, g, b), l = (x + n) / 2, d = x - n, h = 0, sa = 0;
    if (d) { sa = d / (1 - Math.abs(2 * l - 1)); h = x === r ? ((g - b) / d) % 6 : x === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, sa, l];
  };
  var rgb = function (h, sa, l) {
    var c = (1 - Math.abs(2 * l - 1)) * sa, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    var v = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return v.map(function (t) { return Math.round((t + m) * 255); });
  };
  var dist = function (a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); };
  var dh = function (a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  var chroma = function (c) { return (Math.max.apply(0, c) - Math.min.apply(0, c)) / 255; }; // how coloured a colour is; HSL saturation overstates pale tints
  var vivid = function (c) { return chroma(c) >= 0.1; };
  var relation = function (a, b) { // how hue a stands to hue b, by the colour wheel
    if (chroma(a) < 0.08 || chroma(b) < 0.08) return 'neutral';
    var d = dh(hsl(a)[0], hsl(b)[0]);
    return d <= 15 ? 'monochromatic' : d <= 60 ? 'analogous' : d >= 160 ? 'complementary' : d >= 135 ? 'split-complementary' : d >= 105 ? 'triadic' : 'contrasting';
  };

  // the template's palette: opaque backgrounds by area (at least 1.5% of the page), and the colours of its headings, links and buttons
  // visible area: an element's background counts only where no child with its own background or a picture covers it
  var root = document.documentElement, pageA = Math.max(1, root.scrollWidth * root.scrollHeight), pal = [], inks = [];
  var add = function (arr, c, a) { for (var i = 0; i < arr.length; i++) if (dist(arr[i].c, c) < 30) { arr[i].a += a; return arr[i]; } var e = { c: c, a: a }; arr.push(e); return e; };
  var base = add(pal, px(getComputedStyle(document.body).backgroundColor) || px(getComputedStyle(root).backgroundColor) || [255, 255, 255], pageA);
  var owner = function (el) { for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) if (p.__pf) return p.__pf; return base; };
  [].forEach.call(document.body.getElementsByTagName('*'), function (el) {
    if (s.contains(el) || el.closest('.pv')) return;
    var cs = getComputedStyle(el), r = el.getBoundingClientRect(), a = r.width * r.height;
    if (!a || cs.display === 'none' || cs.visibility === 'hidden') return;
    var v = px(cs.backgroundColor);
    if (v || /^(IMG|VIDEO|PICTURE|CANVAS|IFRAME)$/.test(el.tagName)) { var o = owner(el); o.a -= a; if (v) el.__pf = add(pal, v, a); }
    if (/^(H1|H2|H3|A|BUTTON|B|STRONG|EM)$/.test(el.tagName)) { var t = px(cs.color); if (t) add(inks, t, a); }
  });
  var byArea = function (x, y) { return y.a - x.a; };
  pal.forEach(function (p) { p.a = Math.max(0, p.a); });
  var Pa = pal.filter(function (p) { return p.a / pageA >= 0.015; }).sort(byArea).slice(0, 8), P = Pa.map(function (p) { return p.c; });
  // the page's tonal key: how much of what one sees is light, mid or dark (60-30-10: the form follows what dominates, not the darkest band)
  var tone = function (c) { var l = L(c); return l > 0.45 ? 'light' : l < 0.12 ? 'dark' : 'mid'; }, share = { light: 0, mid: 0, dark: 0 }, sum = 0;
  Pa.forEach(function (p) { share[tone(p.c)] += p.a; sum += p.a; });
  for (var t in share) share[t] = sum ? share[t] / sum : 0;
  var I = inks.sort(byArea).slice(0, 6).map(function (p) { return p.c; });
  var all = P.concat(I);

  // the bands right above and below the form
  var sib = function (el, d) { while (el && /^(STYLE|SCRIPT|LINK)$/.test(el.tagName)) el = el[d]; return el; };
  var edge = function (el, c) { while (el) { var v = px(getComputedStyle(el).backgroundColor); if (v) return v; el = el[c]; } return null; };
  var prev = nb ? nb.prev : edge(sib(s.previousElementSibling, 'previousElementSibling'), 'lastElementChild'), next = nb ? nb.next : edge(sib(s.nextElementSibling, 'nextElementSibling'), 'firstElementChild');
  // too close to a neighbour = the two run together. For the form always strict; for the template's own bands (nb.soft, the report) a slight shift
  // between two light neutrals (white next to warm white) is an intended, common way to separate sections, so only near-identical counts there
  var close = function (a, b) { return b && (nb && nb.soft && tone(a) === 'light' && tone(b) === 'light' && !vivid(a) && !vivid(b) ? dist(a, b) < 12 : dist(a, b) < 60); };
  var near = function (c) { return close(c, prev) || close(c, next); };
  // two large areas in contrasting hues compete (60-30-10: a contrasting hue is an accent, not a band next to a band)
  var CONTRAST = { complementary: 1, 'split-complementary': 1, triadic: 1, contrasting: 1 };
  var fights = function (c) { return [prev, next].some(function (n) { return n && vivid(c) && vivid(n) && CONTRAST[relation(c, n)]; }); };

  // panel candidates: the template's background colours, and deeper / lighter tones of its coloured backgrounds
  var cands = P.map(function (c) { return { c: c, kind: 'palette', from: c }; });
  P.forEach(function (c) { var h = hsl(c); (!vivid(c) ? [0.12, 0.2, 0.86, 0.9] : h[2] < 0.6 && !(h[0] >= 25 && h[0] <= 80) ? [0.11, 0.17, 0.24, 0.86, 0.93, 0.96] : [0.86, 0.93, 0.96]).forEach(function (l) { cands.push({ c: rgb(h[0], Math.min(h[1], 0.65), l), kind: 'tone', from: c }); }); });

  var out = [], seen;
  var build = function (strict) { seen = {}; cands.forEach(function (k) {
    var bg = k.c, key = bg.join();
    if (seen[key] || near(bg) || fights(bg)) return;
    seen[key] = 1;
    var h = hsl(bg), dark = L(bg) < 0.18, fit = share[tone(bg)];
    if (strict && k.kind === 'tone' && fit < 0.2) return; // a new tone only at a lightness the page already uses widely (no dark band on a pastel page)
    var fg = all.concat([rgb(h[0], Math.min(h[1], 0.3), 0.96), rgb(h[0], Math.min(h[1], 0.4), 0.1)]).filter(function (c) { return cr(c, bg) >= 7; })[0];
    if (!fg) return;
    var hl = all.filter(function (c) { return vivid(c) && cr(c, bg) >= 3 && dist(c, bg) >= 60; })[0] || fg;
    var on = [bg, fg, [0, 0, 0], [255, 255, 255]].filter(function (c) { return cr(hl, c) >= 4.5; })[0];
    var flow = prev ? relation(bg, prev) : 'neutral';
    var score = (k.kind === 'palette' ? 3 : 2) + 4 * fit + (hl !== fg ? 0.5 : 0) + (flow === 'monochromatic' ? 1 : flow === 'analogous' ? 0.5 : 0) + (vivid(k.from) ? 0.5 : 0); // a tone of one of the template's colours beats a grey
    out.push({ bg: bg, fg: fg, hl: hl, on: on, kind: k.kind, from: k.from, harmony: k.kind === 'tone' ? 'monochromatic' : 'palette', flow: flow,
      accent: hl === fg ? 'text colour' : relation(hl, bg), score: Math.round(score * 100) / 100, fit: Math.round(fit * 100) / 100, dark: dark, cr: { fg: cr(fg, bg), hl: cr(hl, bg), on: cr(on, hl) } });
  }); };
  build(true);
  if (!out.length) build(false); // nothing fits the page's key: allow a new tone at another lightness rather than a foreign colour
  out.sort(function (x, y) { return y.score - x.score; });
  return { palette: P, inks: I, key: share, prev: prev, next: next, combos: out, lib: { px: px, relation: relation, tone: tone, dist: dist, vivid: vivid, cr: cr, close: close, sib: sib, edge: edge } };
}
