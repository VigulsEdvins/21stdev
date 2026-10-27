(function () {
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var art = document.getElementById("btArt");
  var ticket = document.getElementById("btTicket");
  var tilt = document.getElementById("btTilt");
  var btn = document.getElementById("btTear");

  // flowing contour lines + a coral sun
  var sun = document.createElementNS(NS, "circle");
  sun.setAttribute("cx", "252"); sun.setAttribute("cy", "105"); sun.setAttribute("r", "46"); sun.setAttribute("fill", "#ff6a4d");
  art.appendChild(sun);
  for (var i = 0; i < 26; i++) {
    var y = 20 + i * 8, d = "M0 " + y;
    for (var x = 0; x <= 300; x += 25) d += " L" + x + " " + (y + Math.sin(x / 38 + i * 0.35) * (6 + i * 0.5)).toFixed(1);
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", d); p.setAttribute("fill", "none"); p.setAttribute("stroke", "#7fe0c2");
    p.setAttribute("stroke-width", "0.8"); p.setAttribute("opacity", (0.15 + (i / 26) * 0.5).toFixed(2));
    art.appendChild(p);
  }

  // letter delays
  Array.prototype.forEach.call(document.querySelectorAll(".bt-title span"), function (s, k) { s.style.setProperty("--i", k); });

  // barcode
  var bars = document.getElementById("btBars"), seed = 482;
  for (var b = 0; b < 30; b++) {
    seed = (seed * 9301 + 49297) % 233280;
    var el = document.createElement("i");
    el.style.width = 1 + Math.round((seed / 233280) * 4) + "px";
    bars.appendChild(el);
  }

  // pointer tilt
  if (!reduce) {
    tilt.addEventListener("pointermove", function (e) {
      var r = tilt.getBoundingClientRect();
      ticket.style.setProperty("--ry", ((e.clientX - r.left) / r.width - 0.5) * 8 + "deg");
      ticket.style.setProperty("--rx", (0.5 - (e.clientY - r.top) / r.height) * 6 + "deg");
    });
    tilt.addEventListener("pointerleave", function () { ticket.style.setProperty("--rx", "0deg"); ticket.style.setProperty("--ry", "0deg"); });
  }

  // tear / restore
  btn.addEventListener("click", function () {
    var torn = ticket.classList.toggle("is-torn");
    btn.textContent = torn ? "Attach the stub again" : "Tear off the stub";
  });
})();
