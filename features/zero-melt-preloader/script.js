(function () {
  var root = document.getElementById("tgRoot");
  var gate = document.getElementById("tgGate");
  var cv = document.getElementById("tgCanvas");
  var ctx = cv.getContext("2d");
  var count = document.getElementById("tgCount");
  var bar = document.getElementById("tgBar");
  var msg = document.getElementById("tgMsg");
  var skip = document.getElementById("tgSkip");
  var replay = document.getElementById("tgReplay");
  var site = document.getElementById("tgSite");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, dpr = 1, pts = [], drawing = false, phase = "count", raf = 0, tCount = 0;

  function setPhase(p) { phase = p; root.setAttribute("data-phase", p); }
  function say(t, bad) {
    msg.textContent = t;
    msg.classList.remove("is-bad");
    if (bad) { void msg.offsetWidth; msg.classList.add("is-bad"); }
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = root.clientWidth; H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint();
  }

  // stage 1: counter 0 -> 100
  function startCount() {
    cancelAnimationFrame(raf);
    root.classList.remove("is-exiting"); root.removeAttribute("data-completed"); replay.hidden = true;
    setPhase("count");
    root.style.setProperty("--tg-r", "0px");
    site.setAttribute("aria-hidden", "true");
    pts = []; say("Loading");
    var t0 = performance.now(), dur = reduce ? 600 : 2600;
    (function tick(now) {
      var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 2.2);
      var n = Math.round(e * 100);
      count.textContent = String(n).padStart(3, "0");
      bar.style.transform = "scaleX(" + e + ")";
      if (k < 1) raf = requestAnimationFrame(tick); else offerDraw();
    })(t0);
  }
  function offerDraw() {
    setPhase("draw");
    say("Draw a circle to enter");
    skip.focus({ preventScroll: true });
  }

  // stage 2: trace a circle
  function paint() {
    ctx.clearRect(0, 0, W, H);
    if (pts.length < 2) return;
    ctx.lineCap = ctx.lineJoin = "round";
    for (var pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = pass ? "#eafffb" : "rgba(94,224,200,0.35)";
      ctx.lineWidth = pass ? 2 : 10;
      ctx.stroke();
    }
  }
  function localPoint(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  function judge() {
    if (pts.length < 20) return null;
    var cx = 0, cy = 0, i;
    pts.forEach(function (p) { cx += p.x; cy += p.y; });
    cx /= pts.length; cy /= pts.length;
    var rs = pts.map(function (p) { return Math.hypot(p.x - cx, p.y - cy); });
    var mean = rs.reduce(function (a, b) { return a + b; }, 0) / rs.length;
    var dev = Math.sqrt(rs.reduce(function (a, r) { return a + (r - mean) * (r - mean); }, 0) / rs.length) / mean;
    var swept = 0, prev = Math.atan2(pts[0].y - cy, pts[0].x - cx);
    for (i = 1; i < pts.length; i++) {
      var a = Math.atan2(pts[i].y - cy, pts[i].x - cx), d = a - prev;
      if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      swept += d; prev = a;
    }
    var gap = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
    if (mean < Math.min(W, H) * 0.06) return { err: "Make it bigger" };
    if (Math.abs(swept) < Math.PI * 1.7) return { err: "Go all the way round" };
    if (dev > 0.3) return { err: "Rounder, please" };
    if (gap > mean * 0.9) return { err: "Close the loop" };
    return { cx: cx, cy: cy, r: mean };
  }

  function open(cx, cy) {
    setPhase("open");
    say("Open");
    site.removeAttribute("aria-hidden");
    root.style.setProperty("--tg-cx", cx + "px");
    root.style.setProperty("--tg-cy", cy + "px");
    var far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 20;
    var t0 = performance.now(), dur = reduce ? 1 : 1100;
    (function tick(now) {
      var k = Math.min(1, (now - t0) / dur), e = k * k * (3 - 2 * k);
      root.style.setProperty("--tg-r", e * far + "px");
      ctx.clearRect(0, 0, W, H);
      if (k < 1) raf = requestAnimationFrame(tick); else {
        setPhase("shown");
        setTimeout(function () {
          root.classList.add("is-exiting");
          setTimeout(function () { setPhase("done"); root.setAttribute("data-completed", "true"); replay.hidden = false; }, reduce ? 150 : 650);
        }, reduce ? 100 : 800);
      }
    })(t0);
  }

  cv.addEventListener("pointerdown", function (e) {
    if (phase !== "draw") return;
    drawing = true; pts = [localPoint(e)];
    cv.setPointerCapture(e.pointerId);
    say("Keep going");
  });
  cv.addEventListener("pointermove", function (e) {
    if (!drawing) return;
    pts.push(localPoint(e)); paint();
  });
  function end() {
    if (!drawing) return;
    drawing = false;
    var res = judge();
    if (res && !res.err) { open(res.cx, res.cy); return; }
    say(res ? res.err : "A little longer", true);
    setTimeout(function () { if (phase === "draw") { pts = []; paint(); say("Draw a circle to enter"); } }, 900);
  }
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);
  skip.addEventListener("click", function () { open(W / 2, H / 2); });
  replay.addEventListener("click", function () { startCount(); });
  window.addEventListener("resize", resize);

  resize();
  startCount();
})();
