(function () {
  var stage = document.getElementById("ibStage"), svg = document.getElementById("ibSvg"), base = document.getElementById("ibBase"), next = document.getElementById("ibNext"), blots = document.getElementById("ibBlots");
  var title = document.getElementById("ibTitle"), label = document.getElementById("ibLabel"), dotsEl = document.getElementById("ibDots");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function scene(a, b, c, sun, hills) {
    return '<defs><linearGradient id="g' + sun + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs>' +
      '<rect width="1600" height="900" fill="url(#g' + sun + ')"/><circle cx="' + (300 + sun * 260) + '" cy="' + (260 + (sun % 2) * 80) + '" r="120" fill="' + c + '" opacity=".9"/>' +
      hills.map(function (h, i) { return '<path d="M0 ' + (560 + i * 90) + ' Q 400 ' + (440 + i * 90 + h) + ' 800 ' + (580 + i * 80) + ' T 1600 ' + (540 + i * 100) + ' V900 H0Z" fill="' + ["#0000002a", "#00000040", "#00000066"][i] + '"/>'; }).join("");
  }
  var S = [
    { t: "Ember coast", g: scene("#2b1230", "#e2643c", "#ffd58a", 0, [30, 10, -20]) },
    { t: "Glass lake", g: scene("#0f3a4a", "#7fd0c8", "#f3ffe9", 1, [-30, 20, 0]) },
    { t: "Violet fields", g: scene("#2a1a5c", "#b57cf0", "#ffe3f4", 2, [10, -30, 25]) },
    { t: "Moss hours", g: scene("#12301f", "#9ac46a", "#fff4b8", 3, [40, 0, -30]) }
  ];
  var cur = 0, busy = false, dots = [];
  S.forEach(function (s, i) { var d = document.createElement("button"); d.type = "button"; d.className = "ib-dot"; d.setAttribute("aria-label", "Scene " + (i + 1) + ": " + s.t); d.addEventListener("click", function (e) { e.stopPropagation(); go(i, null); }); dotsEl.appendChild(d); dots.push(d); });
  function info(i) { title.textContent = S[i].t; label.textContent = "Scene " + (i + 1) + " of " + S.length; dots.forEach(function (d, k) { d.setAttribute("aria-current", k === i ? "true" : "false"); }); }
  base.innerHTML = S[0].g; info(0);
  function go(i, pt) {
    i = (i + S.length) % S.length; if (busy || i === cur) return;
    busy = true; next.innerHTML = S[i].g; next.setAttribute("mask", "url(#ibM)"); info(i);
    var cx = pt ? pt.x : 800, cy = pt ? pt.y : 450, rnd = [], k;
    for (k = 0; k < 7; k++) rnd.push({ a: Math.random() * 6.283, d: 0.5 + Math.random() * 0.7, r: 0.15 + Math.random() * 0.2 });
    var dur = reduce ? 1 : 1500, t0 = performance.now();
    (function tick(now) {
      var u = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - u, 3), R = e * 1250, h = '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '"/>';
      rnd.forEach(function (o) { h += '<circle cx="' + (cx + Math.cos(o.a) * R * o.d) + '" cy="' + (cy + Math.sin(o.a) * R * o.d) + '" r="' + (R * o.r) + '"/>'; });
      blots.innerHTML = h;
      if (u < 1) requestAnimationFrame(tick);
      else { base.innerHTML = S[i].g; next.innerHTML = ""; blots.innerHTML = ""; cur = i; busy = false; }
    })(t0);
  }
  function toSvg(e) { var r = svg.getBoundingClientRect(), s = Math.max(r.width / 1600, r.height / 900); return { x: (e.clientX - r.left - (r.width - 1600 * s) / 2) / s, y: (e.clientY - r.top - (r.height - 900 * s) / 2) / s }; }
  stage.addEventListener("click", function (e) { go(cur + 1, toSvg(e)); });
  document.getElementById("ibNextBtn").addEventListener("click", function (e) { e.stopPropagation(); go(cur + 1, null); });
  document.getElementById("ibPrev").addEventListener("click", function (e) { e.stopPropagation(); go(cur - 1, null); });
  stage.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") go(cur + 1, null); if (e.key === "ArrowLeft") go(cur - 1, null); });
})();
