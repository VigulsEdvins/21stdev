(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hero = document.getElementById("nsHero");
  var cv = document.getElementById("nsSky");
  var ctx = cv.getContext("2d");
  var stars = [], W = 0, H = 0, dpr = 1, mouse = { x: -999, y: -999 }, raf = 0, visible = true;

  function seed() {
    var n = Math.min(110, Math.round((W * H) / 9000));
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12, r: Math.random() * 1.4 + 0.5, p: Math.random() * 6.28 });
    }
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed(); draw(0);
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var i, j, s, d, linked = [];
    for (i = 0; i < stars.length; i++) {
      s = stars[i];
      if (!reduce) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
      }
      var tw = 0.55 + 0.45 * Math.sin(t / 700 + s.p);
      ctx.fillStyle = "rgba(238,241,255," + tw.toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      d = Math.hypot(s.x - mouse.x, s.y - mouse.y);
      if (d < 170) linked.push(s);
    }
    ctx.lineWidth = 1;
    for (i = 0; i < linked.length; i++) {
      for (j = i + 1; j < linked.length; j++) {
        d = Math.hypot(linked[i].x - linked[j].x, linked[i].y - linked[j].y);
        if (d < 130) {
          ctx.strokeStyle = "rgba(255,90,54," + (1 - d / 130).toFixed(2) + ")";
          ctx.beginPath(); ctx.moveTo(linked[i].x, linked[i].y); ctx.lineTo(linked[j].x, linked[j].y); ctx.stroke();
        }
      }
      ctx.fillStyle = "#ff5a36";
      ctx.beginPath(); ctx.arc(linked[i].x, linked[i].y, linked[i].r + 1.2, 0, 6.283); ctx.fill();
    }
  }
  function loop(t) { draw(t); raf = visible && !reduce ? requestAnimationFrame(loop) : 0; }
  hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; if (reduce) draw(0); });
  hero.addEventListener("pointerleave", function () { mouse.x = mouse.y = -999; if (reduce) draw(0); });
  window.addEventListener("resize", resize);
  resize();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !raf && !reduce) raf = requestAnimationFrame(loop);
    }).observe(hero);
  }
  if (!reduce) raf = requestAnimationFrame(loop);

  // count-up numbers
  var nums = document.querySelectorAll(".ns-stats b");
  function run(el) {
    var end = +el.getAttribute("data-n");
    if (reduce) { el.textContent = end; return; }
    var t0 = performance.now();
    (function tick(now) {
      var k = Math.min(1, (now - t0) / 1200);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { io.observe(n); });
  } else nums.forEach(run);

  // letter form
  var form = document.getElementById("nsForm"), mail = document.getElementById("nsMail"), msg = document.getElementById("nsMsg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (/^\S+@\S+\.\S+$/.test(mail.value)) { form.dispatchEvent(new CustomEvent("edv:submitted", { bubbles: true })); msg.textContent = "Thanks, the next letter is on its way."; mail.value = ""; }
    else msg.textContent = "Please enter a valid email address.";
  });
})();
