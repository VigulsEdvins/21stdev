(function () {
  var stage = document.getElementById("rdStage");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stats = [
    { tab: "Members", pre: "", val: 48200, suf: "", line: "people joined the club this year", note: "Most of them arrived through a friend, and stayed for the Thursday sessions.", word: "Members", f: "#2b50ff", ink: "#ffffff" },
    { tab: "Growth", pre: "+", val: 312, suf: "%", line: "growth in weekly sessions", note: "We added early mornings in spring and the waiting list disappeared in a month.", word: "Growth", f: "#ff5a36", ink: "#fff6ee" },
    { tab: "Rating", pre: "", val: 4.9, suf: "/5", line: "average score from reviews", note: "Reviews are collected by a short form after each session, never by email.", word: "Loved", f: "#14a37f", ink: "#f4fffb" },
    { tab: "Cities", pre: "", val: 27, suf: "", line: "cities with a local chapter", note: "Every chapter is run by volunteers who got their start as regular members.", word: "Cities", f: "#f2c230", ink: "#1a1500" }
  ];
  var cur = 0, timer = 0, paused = false, t0 = 0, raf = 0, DUR = 6000, visible = true;
  var tabs = document.getElementById("rdTabs"), digits = document.getElementById("rdDigits");
  var bar = document.getElementById("rdBar");

  stats.forEach(function (s, i) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "rd-tab"; b.setAttribute("role", "tab"); b.textContent = s.tab;
    b.addEventListener("click", function () { show(i); });
    tabs.appendChild(b);
  });

  function build(str) {
    digits.innerHTML = "";
    str.split("").forEach(function (ch) {
      var col = document.createElement("span");
      col.className = "rd-col";
      if (/\d/.test(ch)) {
        var strip = document.createElement("span");
        strip.className = "rd-strip";
        strip.innerHTML = "0123456789".split("").map(function (d) { return "<span>" + d + "</span>"; }).join("");
        col.appendChild(strip); col.dataset.d = ch;
      } else {
        col.className += " rd-sep"; col.innerHTML = "<span class='rd-strip'><span>" + ch + "</span></span>";
      }
      digits.appendChild(col);
    });
  }
  function roll(str) {
    var cols = digits.children;
    for (var i = 0; i < cols.length; i++) {
      var strip = cols[i].firstChild;
      if (!cols[i].dataset.d) continue;
      strip.style.transitionDelay = reduce ? "0s" : (i * 0.08) + "s";
      strip.style.transform = "translateY(" + (-0.9 * (+str[i])) + "em)";
    }
  }
  function show(i) {
    cur = i;
    var s = stats[i], str = (s.val % 1 ? s.val.toFixed(1) : String(s.val)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    // pre-render at zero so the digits roll up from nothing
    build(str);
    var strips = digits.querySelectorAll(".rd-strip"); strips.forEach(function (x) { x.style.transition = "none"; });
    void digits.offsetWidth;
    strips.forEach(function (x) { x.style.transition = ""; });
    requestAnimationFrame(function () { roll(str); });
    stage.style.setProperty("--f", s.f); stage.style.setProperty("--ink", s.ink);
    stage.dataset.side = i % 2 ? "right" : "left";
    document.getElementById("rdPrefix").textContent = s.pre;
    document.getElementById("rdSuffix").textContent = s.suf;
    document.getElementById("rdLine").textContent = s.line;
    document.getElementById("rdNote").textContent = s.note;
    document.getElementById("rdWord").textContent = s.word;
    document.getElementById("rdSr").textContent = s.pre + str + s.suf + " " + s.line;
    tabs.querySelectorAll(".rd-tab").forEach(function (b, k) { b.setAttribute("aria-selected", String(k === i)); });
    t0 = performance.now();
  }
  function tick(now) {
    raf = 0;
    if (!visible) return;
    if (!paused) {
      var p = (now - t0) / DUR;
      bar.style.width = Math.min(100, p * 100) + "%";
      if (p >= 1) show((cur + 1) % stats.length);
    } else t0 = now - parseFloat(bar.style.width || 0) / 100 * DUR;
    raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf && visible && !reduce) raf = requestAnimationFrame(tick); }
  stage.addEventListener("mouseenter", function () { paused = true; });
  stage.addEventListener("mouseleave", function () { paused = false; });
  stage.addEventListener("focusin", function () { paused = true; });
  stage.addEventListener("focusout", function () { paused = false; });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) { t0 = performance.now(); kick(); } }).observe(stage);
  show(0); kick();
})();
