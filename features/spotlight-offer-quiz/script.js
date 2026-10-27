(function () {
  var pills = document.querySelectorAll('.sq-pill');
  var objs = document.querySelectorAll('.sq-obj');
  var line = document.getElementById('sqLine');
  var answers = document.getElementById('sqAnswers');
  var done = document.getElementById('sqDone');
  var chosen = null;
  function light(i) {
    line.classList.toggle('has-focus', i !== null);
    Array.prototype.forEach.call(objs, function (o, k) { o.classList.toggle('is-lit', k === i); });
  }
  Array.prototype.forEach.call(pills, function (p) {
    var i = +p.dataset.i;
    ['mouseenter', 'focus'].forEach(function (ev) { p.addEventListener(ev, function () { if (chosen === null) light(i); }); });
    ['mouseleave', 'blur'].forEach(function (ev) { p.addEventListener(ev, function () { if (chosen === null) light(null); }); });
    p.addEventListener('click', function () {
      chosen = i;
      Array.prototype.forEach.call(pills, function (q) { q.classList.toggle('is-active', q === p); q.setAttribute('aria-pressed', q === p); });
      light(i);
      answers.hidden = true;
      done.hidden = false;
      done.querySelector('.sq-cta').focus();
    });
  });
})();
