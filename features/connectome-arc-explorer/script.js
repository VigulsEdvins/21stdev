(function () {
  var NS = "http://www.w3.org/2000/svg";
  var svg = document.getElementById("caSvg"), menu = document.getElementById("caMenu"), out = document.getElementById("caOut");
  var CX = 500, CY = 270, R0 = 205, R1 = 245;
  var DISTRICTS = ["Harbor", "Old Mill", "Northgate", "Lakeside", "Market", "Hilltop", "Station", "Orchard"];
  // each district belongs to one of four zone nodes on each side
  var ZONES = ["North zone", "East zone", "South zone", "West zone"], ZONE_OF = [2, 3, 0, 0, 1, 1, 2, 3];
  var LINES = [["Line 1", "ring"], ["Line 2", "ring"], ["Line 4", "express"], ["Line 7", "express"], ["Line 9", "night"], ["Line 12", "local"], ["Line 15", "local"], ["Line 21", "local"], ["Line 30", "airport"], ["Line 42", "night"]];
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  var DATA = LINES.map(function (l, i) {
    var r = rnd(97 + i * 53);
    var mk = function () { return DISTRICTS.map(function () { var v = r(); return v < 0.35 ? 0 : Math.round(v * v * 9000 + 300); }); };
    return { inb: mk(), outb: mk() };
  });

  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function pol(a, r) { return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; }
  function sector(a0, a1, r0, r1) {
    var p = [pol(a0, r1), pol(a1, r1), pol(a1, r0), pol(a0, r0)], big = a1 - a0 > Math.PI ? 1 : 0;
    return "M" + p[0] + " A" + r1 + " " + r1 + " 0 " + big + " 1 " + p[1] + " L" + p[2] + " A" + r0 + " " + r0 + " 0 " + big + " 0 " + p[3] + " Z";
  }
  var fmt = function (n) { return n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n); };

  var sides = [{ dir: -1, color: "var(--ca-a)", key: "inb", nx: 90 }, { dir: 1, color: "var(--ca-b)", key: "outb", nx: 910 }], parts = [];
  var ribG = el("g", {}, svg), arcG = el("g", {}, svg), nodeG = el("g", {}, svg);
  sides.forEach(function (s) {
    // 8 districts spread over a 120 degree arc facing away from the centre
    var mid = s.dir < 0 ? Math.PI : 0, span = 1.72, per = span / DISTRICTS.length, side = { s: s, segs: [], nodes: [] };
    DISTRICTS.forEach(function (d, i) {
      var a0 = mid - span / 2 + i * per + 0.02, a1 = a0 + per - 0.04, am = (a0 + a1) / 2;
      var p = el("path", { d: sector(a0, a1, R0, R1), fill: s.color, "fill-opacity": 0.1, "class": "ca-seg" }, arcG);
      var t = pol(am, R1 + 16); var tx = el("text", { x: t[0], y: t[1], "class": "ca-seglab" }, arcG); tx.textContent = d;
      side.segs.push({ p: p, am: am });
    });
    ZONES.forEach(function (z, i) {
      var y = 90 + i * 127, g = el("g", {}, nodeG);
      var c = el("circle", { cx: s.nx, cy: y, r: 20, stroke: s.color, fill: s.color, "class": "ca-node" }, g);
      var l = el("text", { x: s.nx, y: y - 36, "class": "ca-lab" }, g); l.textContent = z;
      var v = el("text", { x: s.nx, y: y + 46, "class": "ca-sub" }, g);
      side.nodes.push({ c: c, v: v, y: y });
    });
    side.ribs = DISTRICTS.map(function () { return el("path", { "class": "ca-rib", stroke: s.color, "stroke-width": 0, "stroke-opacity": 0.5 }, ribG); });
    parts.push(side);
  });

  var bars = document.createElement("div"); bars.className = "ca-bars"; out.parentNode.appendChild(bars);
  var cur = -1;
  function select(i) {
    cur = i; var d = DATA[i], max = 0;
    Array.prototype.forEach.call(menu.children, function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); });
    parts.forEach(function (side) {
      var vals = d[side.s.key], zoneTot = [0, 0, 0, 0];
      vals.forEach(function (v, k) { zoneTot[ZONE_OF[k]] += v; max = Math.max(max, v); });
      vals.forEach(function (v, k) {
        var seg = side.segs[k], n = side.nodes[ZONE_OF[k]], rib = side.ribs[k];
        seg.p.setAttribute("fill-opacity", v ? (0.25 + 0.75 * Math.min(1, v / 7000)).toFixed(2) : 0.08);
        var a = pol(seg.am, R1), c1 = [a[0] + side.s.dir * 120, a[1]], c2 = [side.s.nx - side.s.dir * 150, n.y];
        var ex = side.s.nx - side.s.dir * 20;
        rib.setAttribute("d", "M" + a + " C" + c1 + " " + c2 + " " + ex + " " + n.y);
        rib.setAttribute("stroke-width", v ? Math.max(1.5, v / 450).toFixed(1) : 0);
      });
      side.nodes.forEach(function (n, zi) { n.c.setAttribute("r", 12 + Math.sqrt(zoneTot[zi]) / 5); n.v.textContent = fmt(zoneTot[zi]); });
    });
    var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
    out.innerHTML = "<b></b><span></span>";
    out.firstChild.textContent = LINES[i][0] + " (" + LINES[i][1] + ")";
    out.lastChild.textContent = fmt(sum(d.inb)) + " boarding, " + fmt(sum(d.outb)) + " alighting per day";
    bars.innerHTML = "";
    DISTRICTS.forEach(function (n, k) {
      var r = document.createElement("div"); r.innerHTML = "<span></span><div class='pair'><i></i><i class='o'></i></div><b></b>";
      r.firstChild.textContent = n; r.querySelector("i").style.width = Math.max(2, d.inb[k] / 90) + "%"; r.querySelector("i.o").style.width = Math.max(2, d.outb[k] / 90) + "%";
      r.lastChild.textContent = fmt(d.inb[k]) + " / " + fmt(d.outb[k]); bars.appendChild(r);
    });
  }
  LINES.forEach(function (l, i) {
    var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "option");
    b.innerHTML = "<span></span><small></small>"; b.firstChild.textContent = l[0]; b.lastChild.textContent = l[1];
    b.addEventListener("click", function () { select(i); });
    b.addEventListener("keydown", function (e) {
      var k = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0; if (!k) return;
      e.preventDefault(); var j = Math.max(0, Math.min(LINES.length - 1, i + k)); select(j); menu.children[j].focus();
    });
    menu.appendChild(b);
  });
  select(2);
})();
