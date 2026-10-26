(function () {
  var sec = document.querySelector('.nw-sec');
  var mark = sec.querySelector('.nw-mark');
  var form = sec.querySelector('.nw-form');
  var input = sec.querySelector('.nw-input');
  var msg = sec.querySelector('.nw-msg');
  var btn = sec.querySelector('.nw-btn');
  var WORD = 'LETTERBOX', timer = 0;
  WORD.split('').forEach(function (c, i) {
    var s = document.createElement('span');
    s.textContent = c;
    s.style.setProperty('--i', i);
    s.style.setProperty('--r', ((i * 37) % 50 - 25) + 'deg');
    mark.appendChild(s);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sec.classList.contains('is-done')) return;
    var v = input.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      msg.textContent = 'Please enter a valid email address.';
      msg.classList.add('is-bad');
      input.focus();
      return;
    }
    msg.classList.remove('is-bad');
    msg.textContent = 'You are on the list. See you on Sunday.';
    sec.classList.add('is-done');
    btn.textContent = 'Subscribed';
    clearTimeout(timer);
    timer = setTimeout(function () {
      sec.classList.remove('is-done');
      btn.textContent = 'Subscribe';
      input.value = '';
      msg.textContent = '';
    }, 5000);
  });
})();
