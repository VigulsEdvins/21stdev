(function () {
  var track = document.getElementById("swTrack"), col = document.getElementById("swCol"), linesBox = document.getElementById("swLines");
  var shape = document.getElementById("swShape"), text = document.getElementById("swText"), NS = "http://www.w3.org/2000/svg";
  var words = text.textContent.trim().split(/\s+/), widths = [], space = 5, LH = 30, GAP = 14, SH = 230, MIN = 70;
  var W = 0, lines = [], measure = document.createElement("canvas").getContext("2d");

  // half-width of the bulb at height y (0 = top of the glass)
  function hw(y) {
    if (y < 0 || y > SH) return 0;
    if (y <= 118) return Math.sqrt(Math.max(0, 4900 - (y - 70) * (y - 70)));
    if (y <= 152) { var t = (y - 118) / 34; t = t * t * (3 - 2 * t); return 49 + (27 - 49) * t; }
    if (y <= 218) return 27;
    return 27 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 218) / 12, 2)));
  }
  function buildShape() {
    var L = [], R = [];
    for (var y = 0; y <= SH; y += 3) { L.push([70 - hw(y), y]); R.unshift([70 + hw(y), y]); }
    var pts = L.concat(R).map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    shape.setAttribute("width", 140); shape.setAttribute("height", SH);
    shape.innerHTML = "<polygon class='body' points='" + pts + "'/><ellipse class='glow' cx='48' cy='48' rx='14' ry='24' transform='rotate(35 48 48)'/>" +
      "<path class='fil' d='M54 168V92l16 24 16-24v76'/><path class='cap' d='M44 178h52M44 190h52M44 202h52'/>";
  }
  function measureWords() {
    var cs = getComputedStyle(col); measure.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily; LH = parseFloat(cs.lineHeight) || 30;
    space = measure.measureText(" ").width; widths = words.map(function (w) { return measure.measureText(w).width; });
  }
  // fill the text line by line, skipping the horizontal span the shape covers in each band
  function layout(cx, top) {
    var wi = 0, y = 0, out = [];
    while (wi < words.length && out.length < 80) {
      var h = 0; [y + 2, y + LH / 2, y + LH - 2].forEach(function (s) { h = Math.max(h, hw(s - top)); });
      var segs = h ? [[0, cx - h - GAP], [cx + h + GAP, W]] : [[0, W]];
      segs.forEach(function (sg) {
        var sw = sg[1] - sg[0]; if (sw < MIN || wi >= words.length) return;
        var s = "", used = 0;
        while (wi < words.length) { var add = (s ? space : 0) + widths[wi]; if (used + add > sw && s) break; if (used + add > sw && !s) break; s += (s ? " " : "") + words[wi]; used += add; wi++; }
        if (s) out.push({ x: sg[0], y: y, s: s });
      });
      y += LH;
    }
    return { out: out, height: y };
  }
  var cache = [];
  function draw(list) {
    while (cache.length < list.length) { var d = document.createElement("span"); d.className = "sw-line"; linesBox.appendChild(d); cache.push(d); }
    cache.forEach(function (d, i) {
      var l = list[i]; if (!l) { d.style.display = "none"; return; }
      d.style.display = ""; d.style.left = l.x.toFixed(1) + "px"; d.style.top = l.y + "px"; d.textContent = l.s;
    });
  }
  var base = 0;
  function update() {
    W = col.clientWidth;
    var r = track.getBoundingClientRect(), total = r.height - window.innerHeight, p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    if (!base) base = layout(0, 9999).height;
    var top = -SH * 0.55 + p * (base + SH * 0.55 + 40), cx = W / 2 + Math.sin(p * 5) * W * 0.1;
    var res = layout(cx, top); draw(res.out);
    linesBox.style.height = Math.max(base, res.height) + "px";
    shape.style.transform = "translate(" + (cx - 70).toFixed(1) + "px," + top.toFixed(1) + "px) rotate(" + (Math.sin(p * 7) * 2.5).toFixed(1) + "deg)";
  }
  function resplit() { words = text.textContent.trim().split(/\s+/); base = 0; measureWords(); req(); }
  if (window.MutationObserver) new MutationObserver(resplit).observe(text, { childList: true, characterData: true, subtree: true });
  function init() { measureWords(); buildShape(); base = 0; col.classList.add("is-set"); update(); }
  var t = false;
  function req() { if (!t) { t = true; requestAnimationFrame(function () { t = false; update(); }); } }
  window.addEventListener("scroll", req, { passive: true });
  window.addEventListener("resize", function () { base = 0; measureWords(); req(); });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init);
})();
