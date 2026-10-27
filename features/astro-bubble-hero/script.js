(function () {
  var hero = document.getElementById("bhHero"), stage = document.getElementById("bhStage"), word = document.getElementById("bhWord");
  var cv = document.getElementById("bhCanvas"), ctx = cv.getContext("2d"), label = document.getElementById("bhCount");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var box = { l: 0, r: 100 }, W = 0, H = 0, dpr = 1, mask = document.createElement("canvas"), bubbles = [], bursts = [], popped = 0, running = true, visible = true, looping = false, mouse = { x: -999, y: -999 };
  var HUES = [190, 215, 275, 330, 155];
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  function accent() { return getComputedStyle(hero).getPropertyValue("--accent").trim() || "#7c8cff"; }
  function makeBubble(fresh) {
    var r = rand(10, 44);
    return { x: rand(box.l, box.r), y: fresh ? rand(0, H) : H + r, r: r, vy: rand(0.2, 0.7) * (r < 22 ? 1.3 : 1), ph: rand(0, 6.28), hue: HUES[(Math.random() * HUES.length) | 0], l: rand(52, 72) };
  }
  function resize() {
    var r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = cv.getBoundingClientRect().height;
    cv.width = W * dpr; cv.height = H * dpr; mask.width = cv.width; mask.height = cv.height;
    var m = mask.getContext("2d"), cs = getComputedStyle(word), wr = word.getBoundingClientRect(), cr = cv.getBoundingClientRect();
    m.clearRect(0, 0, mask.width, mask.height); m.scale(dpr, dpr);
    m.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily; m.textAlign = "center"; m.textBaseline = "alphabetic";
    m.letterSpacing = cs.letterSpacing; m.fillStyle = "#000";
    var fs = parseFloat(cs.fontSize);
    m.fillText(word.textContent, wr.left - cr.left + wr.width / 2, wr.top - cr.top + wr.height / 2 + fs * 0.34);
    box.l = wr.left - cr.left; box.r = wr.right - cr.left;
    var n = Math.round((box.r - box.l) * H / 3600); bubbles = []; for (var i = 0; i < n; i++) bubbles.push(makeBubble(true));
  }
  function burst(b) {
    if (reduce) return;
    for (var i = 0; i < 12; i++) { var a = i / 12 * 6.283; bursts.push({ x: b.x, y: b.y, vx: Math.cos(a) * rand(1, 3.2), vy: Math.sin(a) * rand(1, 3.2), life: 1, hue: b.hue }); }
  }
  function frame(t) {
    if (!running || !visible) { looping = false; return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, W, H);
    bubbles.forEach(function (b, i) {
      if (!reduce) {
        b.y -= b.vy; b.x += Math.sin(t / 900 + b.ph) * 0.25;
        var dx = b.x - mouse.x, dy = b.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 90 && d > 0) { b.x += dx / d * 1.4; b.y += dy / d * 1.4; }
        if (b.y < -b.r) bubbles[i] = makeBubble(false);
      }
      var g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r);
      g.addColorStop(0, "hsla(" + b.hue + ",90%,88%,0.95)"); g.addColorStop(1, "hsla(" + b.hue + ",85%," + b.l + "%,0.9)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "hsla(" + b.hue + ",90%,95%,0.7)"; ctx.lineWidth = 1.5; ctx.stroke();
    });
    ctx.globalCompositeOperation = "destination-in"; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = "destination-over"; ctx.globalAlpha = 0.16; ctx.fillStyle = accent(); ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "destination-in"; ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bursts = bursts.filter(function (p) { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life -= 0.035; return p.life > 0; });
    bursts.forEach(function (p) { ctx.fillStyle = "hsla(" + p.hue + ",90%,75%," + p.life.toFixed(2) + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, 3 * p.life + 0.5, 0, 6.283); ctx.fill(); });
    if (!reduce) requestAnimationFrame(frame);
  }
  function start() { if (looping || !visible || reduce) return; looping = true; requestAnimationFrame(frame); }
  cv.addEventListener("pointermove", function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  cv.addEventListener("pointerleave", function () { mouse.x = mouse.y = -999; });
  cv.addEventListener("click", function (e) {
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      if (Math.hypot(b.x - x, b.y - y) <= b.r) { burst(b); bubbles[i] = makeBubble(false); popped++; label.textContent = "Pop the bubbles: " + popped + " so far"; if (reduce) { frameOnce(); } break; }
    }
  });
  function frameOnce() { requestAnimationFrame(function (t) { frame(t); }); }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { var v = en[0].isIntersecting; visible = v; if (v) start(); }).observe(hero);
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { resize(); }, 120); });
  if (window.MutationObserver) new MutationObserver(function () { resize(); }).observe(word, { childList: true, characterData: true, subtree: true });
  function init() { resize(); if (reduce) { frameOnce(); } else start(); }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init);
})();
