(function () {
  var grid = document.getElementById("cqGrid"), pos = document.getElementById("cqPos");
  var SETS = [
    { c: ["#ffd23f", "#2a2a72", "#e8505b", "#14b8a6"], k: ["#1c1a17", "#ffd23f", "#ffe3e5", "#06231f"],
      q: [["The whole team picked it up in a day. We stopped sending status emails the same week.", "Ada Lindqvist, Operations"], ["I did not expect a tool to make planning feel calm, but here we are.", "Tomas Reyes, Studio lead"]], i: ["AL", "TR"] },
    { c: ["#b6e3d4", "#3b1e54", "#ff9f68", "#f4eddc"], k: ["#0f2a22", "#b6e3d4", "#3a1500", "#2a1c3a"],
      q: [["Clear, quick and quietly well made. Our support tickets dropped by a third.", "Mei Okafor, Support"], ["Everything I need is one tap away. It simply stays out of my way.", "Jonas Petrov, Founder"]], i: ["MO", "JP"] },
    { c: ["#ff7a59", "#183a5a", "#e9e2ff", "#ffc7d9"], k: ["#2a0b00", "#ff7a59", "#2b1d54", "#4a0f26"],
      q: [["We moved our whole backlog over in an evening and never looked back.", "Priya Nasser, Product"], ["It feels hand-built, like someone cared about every pixel of the page.", "Leo Hartmann, Design"]], i: ["PN", "LH"] }
  ];
  var idx = 0, busy = false;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function paint() {
    var s = SETS[idx];
    for (var r = 0; r < 4; r++) { grid.style.setProperty("--c" + r, s.c[r]); grid.style.setProperty("--k" + r, s.k[r]); }
    for (var j = 0; j < 2; j++) {
      document.getElementById("cqQ" + j).textContent = s.q[j][0];
      document.getElementById("cqC" + j).textContent = s.q[j][1];
      document.getElementById("cqI" + j).textContent = s.i[j];
    }
    pos.textContent = (idx + 1) + " / " + SETS.length;
  }
  function go(d) {
    if (busy) return; busy = true;
    grid.classList.add("is-swap");
    setTimeout(function () { idx = (idx + d + SETS.length) % SETS.length; paint(); grid.classList.remove("is-swap"); busy = false; }, reduce ? 0 : 340);
  }
  document.getElementById("cqPrev").addEventListener("click", function () { go(-1); });
  document.getElementById("cqNext").addEventListener("click", function () { go(1); });
  paint();
})();
