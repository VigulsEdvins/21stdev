(function () {
  var $ = function (id) { return document.getElementById(id); };
  var daysEl = $("spDays"), slotsEl = $("spSlots"), form = $("spForm"), done = $("spDone"), lenEl = $("spLen");
  var state = { len: 30, day: 0, slot: null };
  var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var days = [], d = new Date();
  while (days.length < 5) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d);
  }
  try { $("spZone").textContent = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " "); } catch (e) {}

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // deterministic "already taken" pattern so the demo looks lived-in
  function taken(di, mins) { return ((di * 7 + mins / 15 * 3) % 5) === 0; }

  function buildDays() {
    daysEl.innerHTML = "";
    days.forEach(function (dt, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "sp-day"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(i === state.day));
      b.innerHTML = "<small>" + dayNames[dt.getDay()] + "</small><strong>" + dt.getDate() + "</strong>";
      b.addEventListener("click", function () { state.day = i; buildDays(); buildSlots(); });
      daysEl.appendChild(b);
    });
  }
  function buildSlots() {
    slotsEl.innerHTML = "";
    for (var m = 9 * 60; m + state.len <= 17 * 60; m += state.len < 30 ? 30 : state.len) {
      (function (m) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "sp-slot";
        var t = pad(Math.floor(m / 60)) + ":" + pad(m % 60);
        b.textContent = t;
        if (taken(state.day, m)) { b.disabled = true; b.setAttribute("aria-label", t + " unavailable"); }
        b.addEventListener("click", function () { choose(t); });
        slotsEl.appendChild(b);
      })(m);
    }
  }
  function label() {
    var dt = days[state.day];
    return dayNames[dt.getDay()] + " " + dt.getDate() + " " + monthNames[dt.getMonth()] + " at " + state.slot + " (" + state.len + " min)";
  }
  function show(step) {
    var pick = step === "pick";
    lenEl.hidden = daysEl.hidden = slotsEl.hidden = !pick;
    form.hidden = step !== "form";
    done.hidden = step !== "done";
  }
  function choose(t) {
    state.slot = t;
    $("spPick").textContent = label();
    show("form");
    $("spName").focus();
  }
  lenEl.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.len = +b.dataset.len;
    lenEl.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
    buildSlots();
  });
  $("spBack").addEventListener("click", function () { show("pick"); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    $("spSummary").textContent = $("spName").value.trim() + ", see you " + label() + ".";
    show("done");
  });
  $("spAgain").addEventListener("click", function () { form.reset(); show("pick"); });

  buildDays(); buildSlots(); show("pick");
})();
