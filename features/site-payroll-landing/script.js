(function () {
  var crews = [
    [['Mara Ostin', 38, 912], ['Teo Bright', 41, 1025], ['Lia Corvane', 36, 864]],
    [['Dov Penner', 44, 1210], ['Ines Halloway', 40, 1000], ['Kit Arden', 32, 736], ['Sol Marrow', 39, 936]],
    [['Rue Vantine', 35, 840], ['Abel Strand', 42, 1092]]
  ];
  var rows = document.getElementById('ppRows'), total = document.getElementById('ppTotal');
  var btn = document.getElementById('ppApprove'), tabs = document.querySelectorAll('.pp-tab');
  var done = {};
  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function show(i) {
    rows.innerHTML = '';
    var sum = 0;
    crews[i].forEach(function (r) {
      var tr = document.createElement('tr');
      [r[0], r[1] + ' h', money(r[2])].forEach(function (t) { var td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
      rows.appendChild(tr); sum += r[2];
    });
    total.textContent = money(sum);
    btn.classList.toggle('is-done', !!done[i]);
    btn.textContent = done[i] ? 'Approved' : 'Approve crew';
    tabs.forEach(function (t, k) { t.classList.toggle('is-on', k === i); t.setAttribute('aria-pressed', k === i); });
    btn.dataset.crew = i;
  }
  tabs.forEach(function (t, i) { t.addEventListener('click', function () { show(i); }); });
  btn.addEventListener('click', function () { var i = +btn.dataset.crew; done[i] = !done[i]; show(i); });
  show(0);
})();
