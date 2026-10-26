(function () {
  var $ = function (id) { return document.getElementById(id); };
  var feed = $("rcFeed"), form = $("rcForm"), input = $("rcInput"), status = $("rcStatus");
  var graph = $("rcGraph"), cur = $("rcCur"), store = $("rcStore"), sessions = $("rcSessions");
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var busy = false, timer = null;

  var MACHINES = [
    { name: "SummariseTickets", states: [["ReadQueue", "tickets", "42 items"], ["GroupByTopic", "clusters", "5 groups"], ["WriteDigest", "digest", "draft v1"], ["SendPreview", "preview", "sent"]] },
    { name: "LaunchChecklist", states: [["ListGoals", "goals", "3 goals"], ["SplitTasks", "tasks", "18 tasks"], ["AssignOwners", "owners", "6 people"], ["PublishPlan", "planUrl", "/plan/7"]] },
    { name: "TidyChangelog", states: [["ScanEntries", "entries", "31 lines"], ["MergeDuplicates", "merged", "9 merged"], ["Reorder", "order", "by date"], ["SaveFile", "file", "CHANGES.md"]] }
  ];

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  function add(node) { feed.appendChild(node); feed.scrollTop = feed.scrollHeight; return node; }
  function setStatus(s, label) { status.dataset.s = s; status.textContent = label; }
  function setSession(t, s) { var b = sessions.querySelector(".is-on"); b.querySelector(".rc-sess-t").textContent = t; b.querySelector(".rc-sess-s").textContent = s; }

  function drawGraph(m) {
    graph.innerHTML = "";
    var all = m.states.map(function (s) { return s[0]; }).concat(["Done"]);
    var w = 54, gap = (300 - w * all.length) / (all.length - 1) + 0;
    all.forEach(function (name, i) {
      var x = i * (w + gap);
      if (i) { var l = document.createElementNS(NS, "line"); l.setAttribute("class", "e"); l.setAttribute("x1", x - gap); l.setAttribute("x2", x); l.setAttribute("y1", 45); l.setAttribute("y2", 45); graph.appendChild(l); }
      var r = document.createElementNS(NS, "rect"); r.setAttribute("class", "n"); r.setAttribute("id", "rcN" + i);
      r.setAttribute("x", x); r.setAttribute("y", 33); r.setAttribute("width", w); r.setAttribute("height", 24); r.setAttribute("rx", i === all.length - 1 ? 12 : 4);
      var t = document.createElementNS(NS, "text"); t.setAttribute("class", "t"); t.setAttribute("id", "rcT" + i);
      t.setAttribute("x", x + w / 2); t.setAttribute("y", 47.5); t.textContent = name.length > 9 ? name.slice(0, 8) + "." : name;
      graph.appendChild(r); graph.appendChild(t);
    });
  }
  function mark(i, on) {
    var r = $("rcN" + i), t = $("rcT" + i); if (!r) return;
    r.classList.toggle("on", on); t.classList.toggle("on", on); if (!on) r.classList.add("ok");
  }
  function drawStore(m) {
    store.innerHTML = "";
    m.states.forEach(function (s) { var dt = el("dt", "", s[1]), dd = el("dd", "", "-"); dd.id = "rcS_" + s[1]; store.appendChild(dt); store.appendChild(dd); });
  }

  function plan(text) {
    var h = 0; for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    var m = MACHINES[h % MACHINES.length];
    add(el("p", "rc-msg rc-note", "Thinking about how to break this down..."));
    setStatus("running", "Planning"); setSession(text.slice(0, 40), "Planning");
    setTimeout(function () {
      var card = el("div", "rc-msg rc-card"), ol = el("ol", "rc-steps"), row = el("div", "rc-row");
      card.appendChild(el("h3", "", m.name));
      m.states.forEach(function (s) { ol.appendChild(el("li", "", s[0])); });
      var ok = el("button", "rc-btn is-main", "Approve and run"), no = el("button", "rc-btn", "Discard");
      ok.type = no.type = "button";
      row.appendChild(ok); row.appendChild(no);
      card.appendChild(el("p", "rc-note", "The machine has " + m.states.length + " steps. Nothing runs until you approve.")); card.appendChild(ol); card.appendChild(row);
      add(card); drawGraph(m); drawStore(m); cur.textContent = "Waiting for approval";
      setStatus("", "Needs approval"); setSession(text.slice(0, 40), "Awaiting approval");
      ok.onclick = function () { ok.disabled = no.disabled = true; run(m, text); };
      no.onclick = function () { ok.disabled = no.disabled = true; add(el("p", "rc-msg rc-note", "Discarded. Ask for something else.")); setStatus("", "Idle"); busy = false; setSession("New request", "Waiting for a prompt"); };
    }, reduce ? 0 : 900);
  }

  function run(m, text) {
    setStatus("running", "Running"); setSession(text.slice(0, 40), "Running");
    var i = 0;
    (function step() {
      if (i > 0) mark(i - 1, false);
      if (i >= m.states.length) {
        mark(m.states.length, true); cur.textContent = "Finished";
        add(el("p", "rc-msg rc-note", "All " + m.states.length + " steps finished."));
        setStatus("done", "Done"); setSession(text.slice(0, 40), "Done"); busy = false; return;
      }
      var s = m.states[i]; mark(i, true); cur.textContent = "In state: " + s[0];
      var box = el("div", "rc-msg rc-state"); box.appendChild(el("b", "", s[0])); box.appendChild(el("code", "", "writes " + s[1])); add(box);
      var cell = $("rcS_" + s[1]);
      setTimeout(function () { if (cell) { cell.textContent = s[2]; cell.className = "set"; } }, reduce ? 0 : 700);
      i++; timer = setTimeout(step, reduce ? 200 : 1300);
    })();
  }

  function submit(text) {
    text = text.trim(); if (!text || busy) return; busy = true;
    var hello = $("rcHello"); if (hello) hello.remove();
    add(el("p", "rc-msg rc-user", text)); input.value = ""; plan(text);
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); submit(input.value); });
  $("rcChips").addEventListener("click", function (e) { var b = e.target.closest(".rc-chip"); if (b) submit(b.textContent); });
  sessions.addEventListener("click", function (e) { var b = e.target.closest(".rc-sess"); if (!b) return; sessions.querySelectorAll(".rc-sess").forEach(function (x) { x.classList.toggle("is-on", x === b); }); });
})();
