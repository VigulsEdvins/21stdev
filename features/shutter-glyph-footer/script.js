(function () {
  var foot = document.getElementById("weFoot");
  var eyes = Array.prototype.slice.call(foot.querySelectorAll(".we-eye"));
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function look(x, y) {
    eyes.forEach(function (eye) {
      var r = eye.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var a = Math.atan2(y - cy, x - cx);
      var d = Math.min(r.width * 0.2, Math.hypot(x - cx, y - cy) / 6);
      eye.firstElementChild.style.setProperty("--px", Math.cos(a) * d + "px");
      eye.firstElementChild.style.setProperty("--py", Math.sin(a) * d + "px");
    });
  }
  window.addEventListener("pointermove", function (e) { look(e.clientX, e.clientY); });
  // rest gaze: slightly down and to the left until a pointer shows up
  var r0 = foot.getBoundingClientRect();
  look(r0.left + r0.width * 0.2, r0.top + r0.height);

  // occasional blink, only while visible
  var seen = true, timer = 0;
  function blink() {
    if (seen && !reduce) {
      eyes.forEach(function (e) { e.classList.add("is-blink"); });
      setTimeout(function () { eyes.forEach(function (e) { e.classList.remove("is-blink"); }); }, 260);
    }
    timer = setTimeout(blink, 2600 + Math.random() * 3200);
  }
  timer = setTimeout(blink, 2000);
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; }).observe(foot);

  // subscribe note
  var form = document.getElementById("weForm"), mail = document.getElementById("weMail"), msg = document.getElementById("weMsg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (/^\S+@\S+\.\S+$/.test(mail.value)) { msg.textContent = "Noted. We will be in touch."; mail.value = ""; }
    else msg.textContent = "That email does not look right.";
  });
  Array.prototype.forEach.call(foot.querySelectorAll("a"), function (a) { a.addEventListener("click", function (e) { e.preventDefault(); }); });
})();
