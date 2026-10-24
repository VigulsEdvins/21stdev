(function () {
  var zone = document.getElementById('fdzZone');
  var input = document.getElementById('fdzInput');
  var browse = document.getElementById('fdzBrowse');
  var list = document.getElementById('fdzFiles');
  var msg = document.getElementById('fdzMsg');
  if (!zone || !input) return;
  var files = [];
  var MAX = 5 * 1024 * 1024;
  function size(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function render() {
    list.textContent = '';
    files.forEach(function (f, i) {
      var li = document.createElement('li'); li.className = 'fdz-file';
      var info = document.createElement('span');
      var name = document.createElement('span'); name.className = 'fdz-name'; name.textContent = f.name;
      var sz = document.createElement('span'); sz.className = 'fdz-size'; sz.textContent = size(f.size);
      info.appendChild(name); info.appendChild(sz);
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'fdz-remove'; rm.textContent = 'Remove';
      rm.setAttribute('aria-label', 'Remove ' + f.name);
      rm.addEventListener('click', function () { files.splice(i, 1); msg.textContent = f.name + ' removed.'; render(); browse.focus(); });
      li.appendChild(info); li.appendChild(rm); list.appendChild(li);
    });
  }
  function add(chosen) {
    var problems = [];
    Array.prototype.forEach.call(chosen, function (f) {
      var okType = /^image\//.test(f.type) || /\.pdf$/i.test(f.name);
      if (!okType) problems.push(f.name + ' is not an image or PDF.');
      else if (f.size > MAX) problems.push(f.name + ' is over 5 MB.');
      else files.push(f);
    });
    msg.textContent = problems.join(' ');
    if (!problems.length && chosen.length) msg.textContent = '';
    render();
  }
  browse.addEventListener('click', function () { input.click(); });
  input.addEventListener('change', function () { add(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.remove('is-over'); }); });
  zone.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) add(e.dataTransfer.files); });
})();
