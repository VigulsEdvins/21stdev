(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.cnb-demo'), function (root, rn) {
  var bar = root.querySelector('.cnb-bar');
  if (!bar) return;
  var KEY = 'cookie_notice_choice';
  var analytics = root.querySelector('.cnb-switch input:not([disabled])');
  var settings = root.querySelector('.cnb-settings');
  var toggle = root.querySelector('.cnb-link');
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* choice lasts until the page is closed */ } }
  function decide(value) {
    save(value);
    bar.hidden = true;
    document.dispatchEvent(new CustomEvent('cookie-consent', { detail: { analytics: value === 'all' || value === 'custom-analytics' } }));
  }
  settings.id = 'cnb-settings-' + rn; toggle.setAttribute('aria-controls', settings.id);
  if (stored()) bar.hidden = true;
  toggle.addEventListener('click', function () {
    var open = settings.hidden;
    settings.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Save my choice' : 'Settings';
    if (!open) decide(analytics.checked ? 'custom-analytics' : 'essential');
  });
  root.querySelector('.cnb-accept').addEventListener('click', function () { decide('all'); });
  root.querySelector('.cnb-decline').addEventListener('click', function () { decide('essential'); });
  });
})();
