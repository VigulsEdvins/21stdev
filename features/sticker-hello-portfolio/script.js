(function () {
  // case study rows
  var CASES = [["01", "Tide Table Atlas", "Print + web / 2024", "#4cc9f0"], ["02", "Paper Plane Bank", "Product UI / 2023", "#ffd23f"], ["03", "Hatch, a seed swap", "Brand / 2023", "#7be0c3"], ["04", "Field Notes Weekly", "Editorial / 2022", "#ff7aa8"]];
  var list = document.getElementById("skCases");
  CASES.forEach(function (c) {
    var li = document.createElement("li");
    li.innerHTML = "<span class='n'></span><a href='#'></a><span class='t'></span><span class='chip' aria-hidden='true'></span>";
    li.querySelector(".n").textContent = c[0]; li.querySelector("a").textContent = c[1]; li.querySelector(".t").textContent = c[2]; li.querySelector(".chip").style.background = c[3];
    list.appendChild(li);
  });

  // generic drag with pointer events, clamped to a container
  function draggable(node, box) {
    var sx, sy, ox, oy;
    node.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      node.setPointerCapture(e.pointerId); node.classList.add("is-drag");
      sx = e.clientX; sy = e.clientY; ox = node.offsetLeft; oy = node.offsetTop;
    });
    node.addEventListener("pointermove", function (e) {
      if (!node.classList.contains("is-drag")) return;
      var x = Math.max(0, Math.min(box.clientWidth - node.offsetWidth, ox + e.clientX - sx));
      var y = Math.max(0, Math.min(box.clientHeight - node.offsetHeight, oy + e.clientY - sy));
      node.style.left = x + "px"; node.style.top = y + "px";
    });
    function end() { node.classList.remove("is-drag"); }
    node.addEventListener("pointerup", end); node.addEventListener("pointercancel", end);
    node.addEventListener("keydown", function (e) {
      var d = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[e.key];
      if (!d) return; e.preventDefault();
      node.style.left = Math.max(0, Math.min(box.clientWidth - node.offsetWidth, node.offsetLeft + d[0])) + "px";
      node.style.top = Math.max(0, Math.min(box.clientHeight - node.offsetHeight, node.offsetTop + d[1])) + "px";
    });
  }
  var stage = document.getElementById("skStage");
  Array.prototype.forEach.call(stage.querySelectorAll(".sk-sticker"), function (s) {
    // convert percentage start to pixels so dragging is predictable
    s.style.left = s.offsetLeft + "px"; s.style.top = s.offsetTop + "px";
    draggable(s, stage);
  });

  // sticker sheet
  var ICONS = [["★", "#ffd23f"], ["♥", "#ff7aa8"], ["☺", "#7be0c3"], ["☀", "#ffb347"], ["♫", "#b9a6ff"], ["✦", "#4cc9f0"], ["☂", "#9be564"]];
  var tray = document.getElementById("skTray"), board = document.getElementById("skBoard"), z = 1, seed = 7;
  ICONS.forEach(function (ic, i) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = ic[0]; b.style.color = ic[1]; b.setAttribute("aria-label", "Add sticker " + (i + 1));
    b.addEventListener("click", function () {
      var p = document.createElement("button"); p.type = "button"; p.className = "sk-pad"; p.textContent = ic[0]; p.style.background = ic[1];
      seed = (seed * 9301 + 49297) % 233280; var r = seed / 233280;
      p.style.setProperty("--r", (r * 40 - 20).toFixed(0) + "deg");
      p.style.left = (r * (board.clientWidth - 90)).toFixed(0) + "px"; p.style.top = (((seed % 97) / 97) * (board.clientHeight - 90)).toFixed(0) + "px";
      p.style.zIndex = ++z; p.setAttribute("aria-label", "Sticker, arrow keys move, Delete peels");
      p.addEventListener("dblclick", function () { p.remove(); });
      p.addEventListener("keydown", function (e) { if (e.key === "Delete" || e.key === "Backspace") { p.remove(); b.focus(); } });
      p.addEventListener("pointerdown", function () { p.style.zIndex = ++z; });
      draggable(p, board); board.appendChild(p);
    });
    tray.appendChild(b);
  });
})();
