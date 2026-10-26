(function () {
  var NS = "http://www.w3.org/2000/svg";
  var scene = document.getElementById("tkScene");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function seeded(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  // layered ridges with a gentle pointer parallax
  var layers = [], tints = ["#5b4a8a", "#4a3d78", "#3a3163", "#2a2450", "#1a1838"];
  el("circle", { cx: 880, cy: 330, r: 70, "class": "tk-sun" }, scene);
  tints.forEach(function (c, i) {
    var rnd = seeded(31 + i * 17), g = el("g", {}, scene), base = 330 + i * 70, amp = 70 + i * 14, d = "M-60 700 L-60 " + base, x = -60;
    while (x < 1280) { x += 36 + rnd() * 46; d += " L" + x.toFixed(0) + " " + (base - rnd() * amp + (i % 2 ? 12 : 0)).toFixed(0); }
    d += " L1280 700 Z";
    el("path", { d: d, fill: c }, g);
    layers.push({ g: g, k: (i + 1) * 4 });
  });
  var hero = document.getElementById("tkHero");
  if (!reduce) hero.addEventListener("pointermove", function (e) {
    var r = hero.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5;
    layers.forEach(function (l) { l.g.style.transform = "translateX(" + (-nx * l.k).toFixed(1) + "px)"; });
  });

  // day-by-day tabs with elevation profile
  var DAYS = [
    { n: "Day 1", t: "Valley floor to Oak Hut", km: 11, up: 820, h: "5 h", p: "A gentle start through larch woods, with a first swim stop at a cold tarn.", e: [900, 1100, 1350, 1500, 1720] },
    { n: "Day 2", t: "Over the Needle Pass", km: 14, up: 1240, h: "7 h", p: "The big climb. Steep scree early, then a long balcony path with views both ways.", e: [1720, 2100, 2480, 2650, 2200, 2050] },
    { n: "Day 3", t: "The high plateau", km: 12, up: 480, h: "5 h", p: "Open grass, marmots and a lunch beside a frozen-looking lake that is not frozen.", e: [2050, 2200, 2250, 2150, 2300, 2280] },
    { n: "Day 4", t: "Ladder gully to Slate Hut", km: 13, up: 960, h: "6.5 h", p: "A short scramble with fixed chains, then a rest day style afternoon with tea.", e: [2280, 2100, 2400, 2700, 2540] },
    { n: "Day 5", t: "Ridge walk and descent", km: 15, up: 700, h: "7 h", p: "The finish: a narrow crest, a long switchback down, and a bus that smells of cheese.", e: [2540, 2800, 2900, 2500, 1900, 1200] }
  ];
  var tabs = document.querySelector(".tk-tabs"), txt = document.getElementById("tkPanelText"), prof = document.getElementById("tkProfile");
  function show(i) {
    var d = DAYS[i];
    Array.prototype.forEach.call(tabs.children, function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); b.tabIndex = j === i ? 0 : -1; });
    txt.innerHTML = "<h3></h3><p></p><div class='tk-meta'><span><b></b>distance</span><span><b></b>climb</span><span><b></b>on trail</span></div>";
    txt.querySelector("h3").textContent = d.n + ": " + d.t;
    txt.querySelector("p").textContent = d.p;
    var bs = txt.querySelectorAll(".tk-meta b"); bs[0].textContent = d.km + " km"; bs[1].textContent = d.up + " m"; bs[2].textContent = d.h;
    var lo = Math.min.apply(0, d.e) - 150, hi = Math.max.apply(0, d.e) + 150, pts = d.e.map(function (v, k) { return [30 + k * (540 / (d.e.length - 1)), 180 - (v - lo) / (hi - lo) * 150]; });
    var line = "M" + pts.map(function (p) { return p[0].toFixed(0) + " " + p[1].toFixed(0); }).join(" L");
    prof.innerHTML = "";
    [60, 110, 160].forEach(function (y) { el("line", { x1: 30, x2: 570, y1: y, y2: y, "class": "tk-grid" }, prof); });
    el("path", { d: line + " L570 180 L30 180 Z", "class": "tk-area" }, prof);
    el("path", { d: line, "class": "tk-line", pathLength: 1 }, prof);
    var t1 = el("text", { x: 30, y: 196 }, prof); t1.textContent = "start " + d.e[0] + " m";
    var t2 = el("text", { x: 570, y: 196, "text-anchor": "end" }, prof); t2.textContent = "end " + d.e[d.e.length - 1] + " m";
    txt.setAttribute("aria-labelledby", "tkTab" + i);
  }
  DAYS.forEach(function (d, i) {
    var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "tab"); b.id = "tkTab" + i; b.textContent = d.n;
    b.addEventListener("click", function () { show(i); });
    b.addEventListener("keydown", function (e) {
      var k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!k) return;
      var j = (i + k + DAYS.length) % DAYS.length; show(j); tabs.children[j].focus();
    });
    tabs.appendChild(b);
  });
  show(0);

  // departures
  var DEP = [["12 Jun, 7 days", "Easy pace", 3, 10], ["03 Jul, 7 days", "Steady pace", 8, 10], ["21 Aug, 7 days", "Steady pace", 5, 10], ["11 Sep, 7 days", "Golden larches", 1, 10]];
  var ul = document.getElementById("tkDatesList");
  DEP.forEach(function (d) {
    var li = document.createElement("li");
    li.innerHTML = "<b></b><span></span><div><div class='tk-seats'><i></i></div><small></small></div><a class='tk-ghost' href='#'>Reserve</a>";
    li.querySelector("b").textContent = d[0]; li.querySelector("span").textContent = d[1];
    li.querySelector("i").style.width = ((10 - d[2]) * 10) + "%";
    li.querySelector("small").textContent = d[2] + " of " + d[3] + " places left";
    ul.appendChild(li);
  });
})();
