(function () {
  var wrap = document.getElementById("scWrap"), stage = document.getElementById("scStage"), dots = document.getElementById("scDots");
  var idx = document.getElementById("scIndex"), nm = document.getElementById("scName"), sub = document.getElementById("scSub");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches, NS = "http://www.w3.org/2000/svg";
  var ITEMS = [
    ["Peach Arch", "Risograph print, edition of 40", ["#ffd9b8", "#ff8f6b", "#7a2e4d"], 0],
    ["Teal Sun", "Screen print on cotton paper", ["#bfeee6", "#2bb3a3", "#0f3d4a"], 1],
    ["Plum Waves", "Two-colour letterpress", ["#e9d4ff", "#9b5de5", "#2b1456"], 2],
    ["Lemon Steps", "Linocut, hand-pulled", ["#fff3a8", "#f4c20d", "#5a3d00"], 3],
    ["Coral Fields", "Giclee on rag paper", ["#ffd1d1", "#ef6f6c", "#4b1d3f"], 4],
    ["Moss Arch", "Risograph print, edition of 60", ["#dff2c9", "#6bbf59", "#1f4a2c"], 0],
    ["Ink Sun", "Screen print, three layers", ["#cfd9ff", "#4a63e7", "#101a4d"], 1],
    ["Dune Waves", "Block print on kraft", ["#f6e3c4", "#d99a4e", "#5c3318"], 2],
    ["Rose Steps", "Linocut with metallic ink", ["#ffd6e7", "#e8588f", "#4a1230"], 3],
    ["Sea Fields", "Giclee on cotton rag", ["#d3f1ff", "#3aa6d9", "#0c3350"], 4]
  ];
  function art(c, kind) {
    var s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 190 250"); s.setAttribute("preserveAspectRatio", "xMidYMid slice");
    var m = ["<rect width='190' height='250' fill='" + c[0] + "'/>"];
    if (kind === 0) m.push("<path d='M30 250V120a65 65 0 0 1 130 0v130z' fill='" + c[1] + "'/><path d='M62 250V125a33 33 0 0 1 66 0v125z' fill='" + c[2] + "'/>");
    if (kind === 1) m.push("<circle cx='95' cy='110' r='62' fill='" + c[1] + "'/><circle cx='95' cy='110' r='34' fill='" + c[2] + "'/><rect y='190' width='190' height='60' fill='" + c[2] + "'/>");
    if (kind === 2) for (var i = 0; i < 6; i++) m.push("<path d='M0 " + (50 + i * 34) + "q24-26 48 0t48 0 48 0 48 0' fill='none' stroke='" + (i % 2 ? c[2] : c[1]) + "' stroke-width='12'/>");
    if (kind === 3) for (var j = 0; j < 5; j++) m.push("<rect x='" + (j * 26 - 10) + "' y='" + (190 - j * 36) + "' width='80' height='" + (60 + j * 36) + "' fill='" + (j % 2 ? c[2] : c[1]) + "'/>");
    if (kind === 4) { m.push("<path d='M0 150q95-70 190 0V250H0z' fill='" + c[1] + "'/><path d='M0 195q95-60 190 0V250H0z' fill='" + c[2] + "'/><circle cx='140' cy='70' r='24' fill='" + c[1] + "'/>"); }
    s.innerHTML = m.join(""); return s;
  }
  var cards = ITEMS.map(function (it, i) {
    var b = document.createElement("button"); b.type = "button"; b.className = "sc-card"; b.setAttribute("aria-label", it[0]); b.appendChild(art(it[2], it[3]));
    b.addEventListener("click", function () { if (!moved) go(i); }); stage.appendChild(b);
    var d = document.createElement("button"); d.type = "button"; d.setAttribute("aria-label", "Go to " + it[0]); d.addEventListener("click", function () { go(i); }); dots.appendChild(d);
    return b;
  });

  var pos = 0, vel = 0, target = 0, raf = 0, last = 0, W = 190, H = 250, drag = null, moved = false, shown = -1, N = ITEMS.length;
  function size() {
    var sw = stage.clientWidth; W = Math.round(Math.max(110, Math.min(200, sw * 0.24))); H = Math.round(W * 1.32);
    wrap.style.setProperty("--sc-w", W + "px"); wrap.style.setProperty("--sc-h", H + "px"); draw();
  }
  function draw() {
    var cur = Math.round(pos);
    cards.forEach(function (c, i) {
      var d = i - pos, a = Math.abs(d), s = 1 - 0.2 * Math.min(1, a);
      var x = d * W * 1.04, y = d * H * 0.6;
      c.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + s.toFixed(3) + ")";
      c.style.opacity = Math.max(0, Math.min(1, 3.4 - a)).toFixed(2); c.style.zIndex = 100 - Math.round(a * 10);
      c.style.setProperty("--dim", (Math.min(1, a) * 0.28).toFixed(2)); c.tabIndex = i === cur ? 0 : -1; c.style.pointerEvents = a > 3 ? "none" : "";
    });
    if (cur !== shown && cur >= 0 && cur < N) {
      shown = cur; idx.textContent = String(cur + 1).padStart(2, "0"); nm.textContent = ITEMS[cur][0]; sub.textContent = ITEMS[cur][1];
      Array.prototype.forEach.call(dots.children, function (b, j) { b.setAttribute("aria-current", j === cur ? "true" : "false"); });
    }
  }
  // spring toward the target slot, only running while something is moving
  function step(now) {
    var dt = Math.min(0.032, (now - last) / 1000); last = now;
    if (!drag) { vel += ((target - pos) * 90 - vel * 13) * dt; pos += vel * dt; }
    draw();
    if (drag || Math.abs(target - pos) > 0.0008 || Math.abs(vel) > 0.002) raf = requestAnimationFrame(step);
    else { pos = target; vel = 0; draw(); raf = 0; }
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } }
  function go(i) { target = Math.max(0, Math.min(N - 1, i)); if (reduce) { pos = target; draw(); } else kick(); }
  document.getElementById("scPrev").addEventListener("click", function () { go(Math.round(target) - 1); });
  document.getElementById("scNext").addEventListener("click", function () { go(Math.round(target) + 1); });
  wrap.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(Math.round(target) + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(Math.round(target) - 1); }
  });
  stage.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, p: pos }; moved = false; });
  window.addEventListener("pointermove", function (e) {
    if (!drag) return; var dx = e.clientX - drag.x; if (Math.abs(dx) > 6) moved = true;
    if (moved) { pos = Math.max(-0.3, Math.min(N - 0.7, drag.p - dx / (W * 1.04))); vel = 0; kick(); }
  });
  window.addEventListener("pointerup", function () {
    if (!drag) return; var was = moved; drag = null;
    if (was) go(Math.round(pos)); setTimeout(function () { moved = false; }, 0);
  });
  var wheelT = 0;
  stage.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) || Date.now() - wheelT < 350) return; wheelT = Date.now(); e.preventDefault(); go(Math.round(target) + (e.deltaX > 0 ? 1 : -1));
  }, { passive: false });
  window.addEventListener("resize", size); size(); go(2);
})();
