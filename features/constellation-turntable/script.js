(function () {
  var NS = "http://www.w3.org/2000/svg", disc = document.getElementById("skDisc"), deck = document.getElementById("skDeck");
  var tracks = [
    { n: "Orion's Belt", t: "3:42", pts: [[-52,-40],[-44,-34],[-36,-28],[-48,-16],[-28,-52],[-34,-12]] },
    { n: "The Long Ladle", t: "4:10", pts: [[10,-30],[22,-34],[32,-26],[40,-20],[44,-8],[34,-2],[42,6]] },
    { n: "Swan Over Water", t: "2:58", pts: [[-8,34],[0,40],[8,48],[16,56],[-16,42],[24,44]] },
    { n: "Little Crown", t: "3:15", pts: [[34,30],[42,34],[48,42],[40,50],[30,46]] }
  ];
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); (parent || disc).appendChild(e); return e; }
  el("circle", { r: 100, fill: "#0a0d1c" });
  var defs = el("defs", {}), g = el("radialGradient", { id: "skG" }, defs);
  el("stop", { offset: "0", "stop-color": "#2a2a6a", "stop-opacity": ".0" }, g); el("stop", { offset: "1", "stop-color": "#4b2a7a", "stop-opacity": ".5" }, g);
  el("circle", { r: 100, fill: "url(#skG)" });
  for (var r = 30; r < 98; r += 2.4) el("circle", { r: r, fill: "none", stroke: "#fff", "stroke-opacity": ".06", "stroke-width": ".4" });
  var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  for (var i = 0; i < 90; i++) { var a = rnd() * 6.283, d = 32 + rnd() * 64; el("circle", { cx: Math.cos(a) * d, cy: Math.sin(a) * d, r: rnd() * .7 + .2, fill: "#dfe6ff", "fill-opacity": rnd() * .6 + .2 }); }
  var groups = tracks.map(function (tr) {
    var gr = el("g", { opacity: ".35" }), pts = tr.pts;
    for (var j = 1; j < pts.length; j++) el("line", { x1: pts[j-1][0], y1: pts[j-1][1], x2: pts[j][0], y2: pts[j][1], stroke: "#ffd98a", "stroke-width": ".6" }, gr);
    pts.forEach(function (p) { el("circle", { cx: p[0], cy: p[1], r: 1.6, fill: "#fff2c4" }, gr); });
    return gr;
  });
  el("circle", { r: 24, fill: "#d9a441" }); el("circle", { r: 20, fill: "none", stroke: "#8a6420", "stroke-width": ".6" }); el("circle", { r: 2.2, fill: "#0a0d1c" });
  var list = document.getElementById("skTracks"), now = document.getElementById("skNow"), sub = document.getElementById("skSub"), btns = [];
  function pick(i) {
    btns.forEach(function (b, k) { b.setAttribute("aria-current", k === i ? "true" : "false"); });
    groups.forEach(function (gr, k) { gr.setAttribute("opacity", k === i ? "1" : ".3"); });
    now.textContent = tracks[i].n; sub.textContent = "Side A, track " + (i + 1);
  }
  tracks.forEach(function (tr, i) {
    var li = document.createElement("li"), b = document.createElement("button");
    b.type = "button"; b.className = "sk-track"; b.innerHTML = "<span></span><span>" + tr.t + "</span>"; b.firstChild.textContent = tr.n;
    b.addEventListener("click", function () { pick(i); setOn(true); });
    li.appendChild(b); list.appendChild(li); btns.push(b);
  });
  var play = document.getElementById("skPlay");
  function setOn(on) { deck.classList.toggle("is-on", on); play.textContent = on ? "Pause" : "Play"; play.setAttribute("aria-pressed", on ? "true" : "false"); }
  play.addEventListener("click", function () { setOn(!deck.classList.contains("is-on")); });
  pick(0); setOn(true);
})();
