(function () {
  var form = document.getElementById("owForm"), input = document.getElementById("owEmail");
  var msg = document.getElementById("owMsg"), count = document.getElementById("owCount");
  var n = parseInt(count.textContent.replace(/\D/g, ""), 10) || 0;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    form.classList.remove("is-bad");
    if (!ok) {
      void form.offsetWidth;
      form.classList.add("is-bad");
      msg.className = "ow-msg is-err"; msg.textContent = "That email does not look right. Please check it.";
      return;
    }
    form.dispatchEvent(new CustomEvent("edv:submitted", { bubbles: true }));
    n += 1; count.textContent = n.toLocaleString("en-US");
    msg.className = "ow-msg is-ok"; msg.textContent = "You are on the list. Thank you!";
    input.value = "";
  });
})();
