(function () {
  var NS = "http://www.w3.org/2000/svg";
  var pic = document.getElementById("piPic");
  var items = Array.prototype.slice.call(document.querySelectorAll("#piList li"));
  var cur = -1;

  // six abstract posters, drawn as SVG strings (viewBox 400 x 500)
  function stripes() { var s = ""; for (var i = 0; i < 10; i++) s += '<rect x="0" y="' + (i * 50) + '" width="400" height="25" fill="' + (i % 2 ? "#ff3d5a" : "#111") + '"/>'; return s; }
  function waves() { var s = ""; for (var i = 0; i < 9; i++) s += '<path d="M0 ' + (140 + i * 40) + ' Q 100 ' + (100 + i * 40) + ' 200 ' + (140 + i * 40) + ' T 400 ' + (140 + i * 40) + ' V500 H0Z" fill="' + ["#e8d9b0", "#9ec3dd", "#4f86b5", "#1f4f86"][i % 4] + '"/>'; return s; }
  function grid() { var s = ""; for (var y = 0; y < 5; y++) for (var x = 0; x < 4; x++) s += '<circle cx="' + (60 + x * 93) + '" cy="' + (65 + y * 93) + '" r="' + (22 + ((x * 3 + y * 5) % 4) * 4) + '" fill="' + ["#e84a3c", "#f2b134", "#f6efd9", "#c9372c"][(x + y) % 4] + '"/>'; return s; }
  function arches() { var s = ""; for (var i = 0; i < 6; i++) { var w = 340 - i * 52, x = 200 - w / 2; s += '<path d="M' + x + ' 470 V' + (260 - i * 18) + ' a' + (w / 2) + ' ' + (w / 2) + ' 0 0 1 ' + w + ' 0 V470Z" fill="none" stroke="hsl(' + (280 - i * 18) + ',85%,' + (45 + i * 7) + '%)" stroke-width="10"/>'; } return s; }
  var art = [
    '<defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b0f3a"/><stop offset=".55" stop-color="#ff7a45"/><stop offset="1" stop-color="#ffd27a"/></linearGradient></defs><rect width="400" height="500" fill="url(#g1)"/><circle cx="200" cy="270" r="90" fill="#fff0c4"/><path d="M0 340 Q 120 300 220 340 T 400 330 V500 H0Z" fill="#5a1f3a"/><path d="M0 400 Q 150 360 260 400 T 400 390 V500 H0Z" fill="#2b0f3a"/>',
    '<rect width="400" height="500" fill="#f2e6c8"/>' + waves(),
    '<rect width="400" height="500" fill="#2f6b4a"/>' + grid(),
    '<rect width="400" height="500" fill="#1a0f3d"/>' + arches(),
    '<rect width="400" height="500" fill="#f4d6c3"/><circle cx="200" cy="200" r="110" fill="#ef5a3c"/><circle cx="200" cy="200" r="70" fill="#f9a66c"/><path d="M0 330 L130 250 L260 340 L400 240 V500 H0Z" fill="#7a3b4f"/><path d="M0 400 L110 340 L240 410 L400 330 V500 H0Z" fill="#43223a"/>',
    '<rect width="400" height="500" fill="#111"/>' + stripes() + '<circle cx="200" cy="250" r="80" fill="#f5f0e1"/>'
  ];
  art.forEach(function (a, i) { art[i] = '<svg xmlns="' + NS + '" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">' + a + '</svg>'; });

  function show(i) {
    if (i === cur) return;
    var dir = i > cur ? "down" : "up";
    var pane = document.createElement("div");
    pane.className = "pi-pane" + (cur >= 0 ? " is-in-" + dir : "");
    pane.innerHTML = art[i];
    pic.appendChild(pane);
    // keep only the newest two panes
    while (pic.children.length > 2) pic.removeChild(pic.firstChild);
    items.forEach(function (li, k) {
      li.classList.toggle("is-on", k === i);
      var b = li.firstElementChild;
      if (k === i) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
    if (cur >= 0) setTimeout(function () { while (pic.children.length > 1 && pic.firstChild !== pane) pic.removeChild(pic.firstChild); }, 750);
    cur = i;
  }

  items.forEach(function (li, i) {
    var b = li.firstElementChild;
    b.addEventListener("pointerenter", function () { show(i); });
    b.addEventListener("focus", function () { show(i); });
    b.addEventListener("click", function () { show(i); });
  });
  document.getElementById("piTot").textContent = ("0" + items.length).slice(-2);
  show(0);
})();
