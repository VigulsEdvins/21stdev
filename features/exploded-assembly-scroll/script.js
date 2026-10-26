(function () {
  var NS = "http://www.w3.org/2000/svg", svg = document.getElementById("baDraw");
  var track = document.getElementById("baTrack"), fill = document.getElementById("baFill"), pct = document.getElementById("baPct");
  var steps = document.querySelectorAll("#baSteps li");

  // parts listed bottom to top: [step, svg markup]
  var PARTS = [
    [0, "<path class='part' d='M110 440h180v22H110z'/><circle class='thin' cx='125' cy='451' r='4'/><circle class='thin' cx='275' cy='451' r='4'/><path class='thin' d='M110 448h180'/>"],
    [0, "<rect class='part' x='96' y='392' width='50' height='16' rx='3'/><path class='part' d='M135 440V380q0-40 35-48h60q35 8 35 48v60z'/><path class='thin' d='M150 400h100'/>"],
    [1, "<ellipse class='hid' cx='200' cy='368' rx='42' ry='14'/><path class='part' d='M160 372q0-22 40-22t40 22q0 14-40 14t-40-14z'/><path class='thin' d='M172 366l56 0M178 376l44 0'/>"],
    [1, "<rect class='part' x='191' y='190' width='18' height='170' rx='2'/><path class='thin' d='M200 190v170'/>"],
    [2, "<path class='part' d='M150 330h100l12 22H138z'/><path class='part' d='M162 330v-22h76v22z'/><circle class='thin' cx='150' cy='342' r='3'/><circle class='thin' cx='250' cy='342' r='3'/>"],
    [3, "<rect class='part' x='150' y='140' width='100' height='108' rx='10'/><path class='thin' d='M150 165h100M150 190h100M150 215h100'/><rect class='part' x='186' y='118' width='28' height='22' rx='4'/>"]
  ];
  var groups = PARTS.map(function (p) {
    var g = document.createElementNS(NS, "g"); g.innerHTML = p[1]; svg.appendChild(g); return g;
  });
  // balloon labels and a centre line that appear when exploded
  var cl = document.createElementNS(NS, "path"); cl.setAttribute("d", "M200 30V590"); cl.setAttribute("class", "cl"); svg.insertBefore(cl, svg.firstChild);
  var labels = ["BASE PLATE", "HOUSING", "IMPELLER", "SHAFT", "COVER", "MOTOR"].map(function (t, i) {
    var x = document.createElementNS(NS, "text"); x.textContent = (i + 1) + " " + t; x.setAttribute("x", 330); svg.appendChild(x); return x;
  });
  var baseY = [451, 400, 368, 215, 335, 190];

  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  function update() {
    var r = track.getBoundingClientRect(), total = r.height - window.innerHeight;
    var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    var e = 1 - ease(Math.min(1, Math.max(0, (p - 0.05) / 0.8)));
    var step = Math.min(3, Math.floor(p * 4 - 0.0001 + (p === 0 ? 0 : 0)));
    groups.forEach(function (g, i) {
      var dy = (2.5 - i) * 56 * e;
      g.setAttribute("transform", "translate(0 " + dy.toFixed(1) + ")");
      g.classList.toggle("on", PARTS[i][0] === step);
      labels[i].setAttribute("y", (baseY[i] + dy).toFixed(1));
      labels[i].style.opacity = Math.max(0, 1 - (1 - e) * 3).toFixed(2);
    });
    cl.style.opacity = e > 0.02 ? 1 : 0;
    Array.prototype.forEach.call(steps, function (li, i) { li.classList.toggle("on", i === step); });
    fill.style.width = (p * 100).toFixed(1) + "%";
    pct.textContent = String(Math.round(p * 100)).padStart(3, "0") + "%";
  }
  var ticking = false;
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); } }
  window.addEventListener("scroll", req, { passive: true });
  window.addEventListener("resize", req);
  update();
})();
