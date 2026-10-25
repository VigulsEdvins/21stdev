(function () {
  var cv = document.getElementById("tgCanvas"), ctx = cv.getContext("2d");
  var degEl = document.getElementById("tgDeg");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ramp = " .:-=+*#%@";
  var rot = 0.6, tilt = 0.38, vel = 0.006, drag = false, lastX = 0, cw = 0, ch = 0, cols = 0, rows = 0, cell = 9, color = "74,222,128", dpr = 1;

  function readColor() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4ade80";
    var tmp = document.createElement("canvas").getContext("2d"); tmp.fillStyle = c; var v = tmp.fillStyle;
    if (v[0] === "#") color = [1, 3, 5].map(function (i) { return parseInt(v.substr(i, 2), 16); }).join(",");
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = cv.clientWidth; ch = cv.clientHeight;
    cv.width = cw * dpr; cv.height = ch * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = cw < 360 ? 7 : 9;
    cols = Math.floor(cw / (cell * 0.6)); rows = Math.floor(ch / cell);
    ctx.font = cell + "px ui-monospace, Menlo, Consolas, monospace"; ctx.textBaseline = "top";
  }
  function line(v, step, w) { var m = ((v % step) + step) % step; return Math.min(m, step - m) < w; }

  function draw() {
    ctx.clearRect(0, 0, cw, ch);
    var R = Math.min(cols * 0.6, rows) * 0.46 * 1;
    var cx = cols / 2, cy = rows / 2, cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
    var lx = -0.5, ly = -0.55, lz = 0.67;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var x = (i - cx) * 0.6 / R, y = (j - cy) / R;
        var d2 = x * x + y * y; if (d2 > 1) continue;
        var z = Math.sqrt(1 - d2);
        var y1 = y * ct - z * st, z1 = y * st + z * ct;
        var x2 = x * cr + z1 * sr, z2 = -x * sr + z1 * cr;
        var lat = Math.asin(-y1) * 57.2958, lon = Math.atan2(x2, z2) * 57.2958;
        var onLine = line(lat + 90, 20, 1.7) || line(lon + 180, 20, 2.1 / Math.max(0.25, Math.cos(lat / 57.2958)));
        var light = Math.max(0, x * lx + y * ly + z * lz);
        var ch2;
        if (onLine) ch2 = ramp[Math.min(9, 4 + Math.round(light * 5))];
        else if (d2 > 0.93) ch2 = ".";
        else if (((i + j) & 1) === 0 && light > 0.35) ch2 = "·";
        else continue;
        ctx.fillStyle = "rgba(" + color + "," + (onLine ? 0.35 + light * 0.65 : 0.22).toFixed(2) + ")";
        ctx.fillText(ch2, i * cell * 0.6, j * cell);
      }
    }
    degEl.textContent = ("00" + Math.round(((rot * 57.2958) % 360 + 360) % 360)).slice(-3);
  }
  function loop() { if (!drag) rot += vel; draw(); requestAnimationFrame(loop); }

  cv.addEventListener("pointerdown", function (e) { drag = true; lastX = e.clientX; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", function (e) { if (!drag) return; var dx = e.clientX - lastX; lastX = e.clientX; rot += dx * 0.012; vel = dx * 0.0008 + (dx ? 0 : vel); });
  function end() { drag = false; if (Math.abs(vel) < 0.003) vel = 0.006; vel = Math.max(-0.03, Math.min(0.03, vel)); }
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  window.addEventListener("resize", resize);

  readColor(); resize();
  if (reduce) draw(); else requestAnimationFrame(loop);
})();
