(function () {
  var track = document.getElementById("stTrack");
  var fill = document.getElementById("stFill");
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

  track.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    var next = target + e.deltaY;
    if ((e.deltaY > 0 && target >= max() - 1) || (e.deltaY < 0 && target <= 1)) return;
    e.preventDefault();
    goTo(next);
  }, { passive: false });

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
  document.getElementById("stPrev").addEventListener("click", function () { step(-1); });
  document.getElementById("stNext").addEventListener("click", function () { step(1); });
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });
  update();
})();
