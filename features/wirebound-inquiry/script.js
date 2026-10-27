(function () {
  var front = document.getElementById('icFront'), form = document.getElementById('icForm'), done = document.getElementById('icDone');
  var steps = Array.prototype.slice.call(form.querySelectorAll('.ic-step'));
  var bars = form.querySelectorAll('.ic-progress i');
  var next = document.getElementById('icNext'), back = document.getElementById('icBack'), err = document.getElementById('icError'), open = document.getElementById('icOpen');
  var cur = 0;

  function show(el) { [front, form, done].forEach(function (x) { x.hidden = x !== el; }); }
  function render() {
    steps.forEach(function (s, i) { s.hidden = i !== cur; });
    Array.prototype.forEach.call(bars, function (b, i) { b.classList.toggle('on', i <= cur); });
    next.textContent = cur === steps.length - 1 ? 'Send brief' : 'Next';
    err.textContent = '';
  }
  function valid() {
    if (cur === 0 && !form.querySelector('[name=type]:checked')) return 'Pick one so we know where to start.';
    if (cur === 1 && !form.querySelector('[name=budget]:checked')) return 'A rough range is fine.';
    if (cur === 2 && !/^\S+@\S+\.\S+$/.test(form.email.value)) return 'Please enter a valid email address.';
    return '';
  }
  open.addEventListener('click', function () { cur = 0; show(form); render(); open.setAttribute('aria-expanded', 'true'); var f = form.querySelector('input'); if (f) f.focus(); });
  next.addEventListener('click', function () {
    var m = valid(); if (m) { err.textContent = m; return; }
    if (cur < steps.length - 1) { cur++; render(); } else { show(done); done.focus(); }
  });
  back.addEventListener('click', function () { if (cur > 0) { cur--; render(); } else { show(front); open.setAttribute('aria-expanded', 'false'); open.focus(); } });
  document.getElementById('icReset').addEventListener('click', function () { form.reset(); show(front); open.setAttribute('aria-expanded', 'false'); open.focus(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
})();
