(function () {
  var hero = document.getElementById("wcHero"), scene = document.getElementById("wcScene");
  var copy = hero.querySelector(".wc-copy"), meter = document.getElementById("wcMeter");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var N = 16, DEPTH = 3200, GOLD = 2.399963;
  var names = ["Atlas", "Ember", "Field", "Bloom", "Drift", "Prism", "Tide", "Quartz", "Halo", "Mesa", "Orbit", "Wisp", "Cedar", "Pulse", "Lumen", "Vale"];
  var cards = [];
  for (var i = 0; i < N; i++) {
    var el = document.createElement("div");
    el.className = "wc-card";
    var hue = (i * 47) % 360;
    el.style.background = "linear-gradient(150deg, hsl(" + hue + ",70%,55%), hsl(" + ((hue + 60) % 360) + ",70%,32%))";
    el.innerHTML = "<span>" + names[i] + "</span>";
    scene.appendChild(el);
    var a = i * GOLD, rad = 0.26 + ((i * 0.37) % 0.5);
    cards.push({ el: el, z0: (i / N) * DEPTH, x: Math.cos(a) * rad, y: Math.sin(a) * rad * 0.8, rot: ((i * 13) % 20) - 10 });
  }
  var pr = 0, sp = 0, mx = 0, my = 0, tx = 0, ty = 0, visible = true, raf = 0, drift = 0, last = performance.now();

  // The hero holds the page (data-scroll-pin): wheel and touch drag move the corridor first, and only once it has
  // reached either end does the page scroll on to the next section (or back up).
  var goal = 0;
  function progress() { return goal; }
  function push(dy, e) {
    var next = Math.max(0, Math.min(1, goal + dy / 1800));
    if ((dy > 0 && goal < 1) || (dy < 0 && goal > 0)) { if (e.cancelable) e.preventDefault(); goal = next; kick(); }
  }
  hero.addEventListener("wheel", function (e) { push(e.deltaY, e); }, { passive: false });
  var ty0 = null;
  hero.addEventListener("touchstart", function (e) { ty0 = e.touches[0].clientY; }, { passive: true });
  hero.addEventListener("touchmove", function (e) {
    if (ty0 === null) return;
    var y = e.touches[0].clientY; push((ty0 - y) * 2, e); ty0 = y;
  }, { passive: false });
  hero.tabIndex = 0;
  hero.addEventListener("keydown", function (e) {
    var d = e.key === "ArrowDown" || e.key === "PageDown" ? 360 : e.key === "ArrowUp" || e.key === "PageUp" ? -360 : 0;
    if (d) push(d, e);
  });
  function render(now) {
    raf = 0; if (!visible) return;
    var dt = Math.min(50, now - last); last = now;
    var target = progress();
    sp += (target - sp) * 0.09;
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    drift += reduce ? 0 : dt * 0.05;
    var w = hero.firstElementChild.clientWidth, h = hero.firstElementChild.clientHeight;
    var travel = sp * DEPTH * 2.2 + drift;
    cards.forEach(function (c) {
      var z = ((c.z0 + travel) % DEPTH);           // 0 = far, DEPTH = at camera
      var depthZ = z - DEPTH + 300;                // translateZ negative = away
      var t = z / DEPTH;
      var spread = 0.55 + t * 1.2;
      var op = Math.min(1, t * 6) * Math.min(1, (1 - t) * 5);
      c.el.style.opacity = op.toFixed(3);
      c.el.style.transform = "translate3d(" + (c.x * w * spread).toFixed(1) + "px," + (c.y * h * spread).toFixed(1) + "px," + depthZ.toFixed(0) + "px) rotateZ(" + (c.rot + t * 18).toFixed(1) + "deg)";
    });
    scene.style.transform = "rotateY(" + (mx * 7).toFixed(2) + "deg) rotateX(" + (-my * 5).toFixed(2) + "deg) translate3d(" + (-mx * 20).toFixed(1) + "px," + (-my * 14).toFixed(1) + "px,0)";
    copy.style.transform = "translateZ(0) scale(" + (1 + sp * 0.12).toFixed(3) + ")";
    copy.style.opacity = (1 - Math.max(0, sp - 0.82) * 5).toFixed(3);
    meter.style.width = (sp * 100).toFixed(1) + "%";
    if (!reduce || Math.abs(target - sp) > 0.001) raf = requestAnimationFrame(render);
  }
  function kick() { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(render); } }
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", kick);
  hero.addEventListener("pointermove", function (e) {
    var r = hero.firstElementChild.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1; kick();
  });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(hero);
  kick();
})();
