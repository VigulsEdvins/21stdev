(function () {
  var shell = document.getElementById("pfShell");
  var toggle = document.getElementById("pfTheme");
  var links = Array.prototype.slice.call(document.querySelectorAll("#pfMenu a"));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });

  // per-row swatch hue
  Array.prototype.forEach.call(document.querySelectorAll("#pfList a"), function (a) { a.style.setProperty("--h", a.getAttribute("data-hue")); });

  // local light/dark switch
  toggle.addEventListener("click", function () {
    var dark = shell.getAttribute("data-mode") !== "dark";
    if (dark) shell.setAttribute("data-mode", "dark"); else shell.removeAttribute("data-mode");
    toggle.setAttribute("aria-pressed", String(dark));
    toggle.lastChild.textContent = dark ? "Light mode" : "Dark mode";
  });

  // menu highlight follows scroll position
  function mark() {
    var cur = 0, y = window.innerHeight * 0.35;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < y) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle("is-on", i === cur); });
  }
  window.addEventListener("scroll", mark, { passive: true });
  window.addEventListener("resize", mark);
  mark();
  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      var t = document.querySelector(a.getAttribute("href"));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".pf-list a, .pf-addr"), function (a) { a.addEventListener("click", function (e) { e.preventDefault(); }); });

  // copy address
  var copy = document.getElementById("pfCopy"), addr = document.getElementById("pfAddr");
  copy.addEventListener("click", function () {
    var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy address"; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr.textContent).then(done, done); else done();
  });
})();
