(function () {
  // Look elements up inside this copy's own section, so a page can hold the timeline more than once
  var host = window.__activeSectionRegisteringId && document.getElementById(window.__activeSectionRegisteringId);
  var scope = host || document;
  var track = scope.querySelector("#stTrack");
  if (!track) return;
  var fill = scope.querySelector("#stFill");
  var rail = track.querySelector(".st-rail");
  var items = Array.prototype.slice.call(track.querySelectorAll(".st-item"));
  var target = track.scrollLeft, raf = 0;

  function max() { return track.scrollWidth - track.clientWidth; }
  function glide() {
    var diff = target - track.scrollLeft;
    if (Math.abs(diff) < 0.5) { track.scrollLeft = target; raf = 0; return; }
    track.scrollLeft += diff * 0.14;
    raf = requestAnimationFrame(glide);
  }
  function goTo(x) {
    target = Math.max(0, Math.min(max(), x));
    if (!raf) raf = requestAnimationFrame(glide);
  }
  function update() {
    rail.style.setProperty("--st-w", track.scrollWidth + "px");
    var mid = track.scrollLeft + track.clientWidth / 2, lastLit = -1;
    items.forEach(function (it, i) {
      var c = it.offsetLeft + it.offsetWidth / 2;
      var on = c <= mid + it.offsetWidth * 0.5;
      it.classList.toggle("is-lit", on);
      if (on) lastLit = i;
    });
    var edge = lastLit < 0 ? 0 : items[lastLit].offsetLeft + items[lastLit].offsetWidth / 2;
    fill.style.width = Math.min(track.scrollWidth, edge) + "px";
  }

  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);

  var down = false, startX = 0, startLeft = 0;
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch") return;
    down = true; startX = e.clientX; startLeft = track.scrollLeft;
    track.classList.add("is-dragging"); track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", function (e) {
    if (!down) return;
    target = track.scrollLeft = Math.max(0, Math.min(max(), startLeft - (e.clientX - startX)));
  });
  function up() { down = false; track.classList.remove("is-dragging"); }
  track.addEventListener("pointerup", up);
  track.addEventListener("pointercancel", up);

  function step(dir) { goTo(track.scrollLeft + dir * items[0].offsetWidth); }
  scope.querySelector("#stPrev").addEventListener("click", function () { step(-1); });
  scope.querySelector("#stNext").addEventListener("click", function () { step(1); });
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });
  update();

  // Pins the section while the page scrolls past it and reports how far through (0 to 1) the visitor is,
  // so the animation plays through with the page scroll
  function pinRunway(el, screens, onProgress) {
    var run = document.createElement('div');
    run.style.cssText = 'position:relative;height:' + screens * 100 + 'vh';
    var pin = document.createElement('div');
    pin.style.cssText = 'position:sticky;top:0;height:100vh;display:grid;grid-template-columns:minmax(0,1fr);align-items:center';
    el.parentNode.insertBefore(run, el); run.appendChild(pin); pin.appendChild(el);
    el.style.alignSelf = 'stretch'; // fill the pinned screen
    function update() {
      var r = run.getBoundingClientRect(), total = r.height - window.innerHeight;
      onProgress(total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  pinRunway(track.closest(".st-stage") || track, 3, function (v) { goTo(v * max()); });
})();
