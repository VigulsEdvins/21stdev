(function () {
  var region = document.getElementById('tnsRegion');
  if (!region) return;
  var LIFE = 4000;
  var MAX = 4;
  var X = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  function dismiss(toast) {
    if (toast.__gone) return;
    toast.__gone = true;
    clearTimeout(toast.__timer);
    toast.classList.add('is-leaving');
    setTimeout(function () { toast.remove(); }, 260);
  }
  function arm(toast, ms) {
    clearTimeout(toast.__timer);
    toast.__deadline = Date.now() + ms;
    toast.__timer = setTimeout(function () { dismiss(toast); }, ms);
  }
  function show(kind, message) {
    var toasts = region.querySelectorAll('.tns-toast:not(.is-leaving)');
    if (toasts.length >= MAX) dismiss(toasts[0]);
    var t = document.createElement('div');
    t.className = 'tns-toast';
    t.setAttribute('data-kind', kind);
    t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    t.style.setProperty('--life', LIFE + 'ms');
    t.innerHTML = '<span class="tns-dot" aria-hidden="true"></span><span class="tns-text"></span><button class="tns-x" type="button" aria-label="Dismiss">' + X + '</button><span class="tns-bar" aria-hidden="true"></span>';
    t.querySelector('.tns-text').textContent = message;
    t.querySelector('.tns-x').addEventListener('click', function () { dismiss(t); });
    t.addEventListener('mouseenter', function () { clearTimeout(t.__timer); t.__left = Math.max(800, t.__deadline - Date.now()); });
    t.addEventListener('mouseleave', function () { arm(t, t.__left || 1500); t.querySelector('.tns-bar').style.animation = 'none'; });
    region.appendChild(t);
    arm(t, LIFE);
  }
  document.querySelectorAll('.tns-btn').forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-kind'), b.getAttribute('data-msg')); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') region.querySelectorAll('.tns-toast').forEach(dismiss);
  });
  // a couple on load so the stack is visible in previews
  setTimeout(function () { show('success', 'Changes saved'); }, 400);
  setTimeout(function () { show('info', 'A new version is available'); }, 900);
})();
