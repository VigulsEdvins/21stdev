(function () {
  var input = document.getElementById('ssbInput');
  var list = document.getElementById('ssbList');
  var picked = document.getElementById('ssbPicked');
  if (!input || !list) return;
  var items = ['Pricing and plans', 'Product tour', 'Customer support', 'Security and privacy', 'Integrations', 'Release notes', 'Careers', 'Contact sales', 'Documentation', 'Status page'];
  var active = -1;
  function render(query) {
    var q = query.trim().toLowerCase();
    var hits = items.filter(function (t) { return !q || t.toLowerCase().indexOf(q) !== -1; }).slice(0, 6);
    list.textContent = '';
    hits.forEach(function (t, i) {
      var li = document.createElement('li');
      li.className = 'ssb-opt'; li.id = 'ssbOpt' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
      var at = q ? t.toLowerCase().indexOf(q) : -1;
      if (at >= 0) {
        li.appendChild(document.createTextNode(t.slice(0, at)));
        var m = document.createElement('mark'); m.textContent = t.slice(at, at + q.length); li.appendChild(m);
        li.appendChild(document.createTextNode(t.slice(at + q.length)));
      } else li.textContent = t;
      li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(t); });
      list.appendChild(li);
    });
    active = -1;
    input.removeAttribute('aria-activedescendant');
    var open = hits.length > 0;
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
  }
  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
  function move(delta) {
    var opts = list.querySelectorAll('.ssb-opt');
    if (!opts.length) return;
    if (active >= 0) opts[active].setAttribute('aria-selected', 'false');
    active = (active + delta + opts.length) % opts.length;
    opts[active].setAttribute('aria-selected', 'true');
    opts[active].scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', opts[active].id);
  }
  function choose(text) { input.value = text; picked.textContent = 'You chose: ' + text; close(); }
  input.addEventListener('input', function () { render(input.value); });
  input.addEventListener('focus', function () { render(input.value); });
  input.addEventListener('blur', close);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) render(input.value); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { var opts = list.querySelectorAll('.ssb-opt'); if (active >= 0 && opts[active]) { e.preventDefault(); choose(opts[active].textContent); } }
    else if (e.key === 'Escape') { close(); }
  });
})();
