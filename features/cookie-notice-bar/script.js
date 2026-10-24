(function () {
  var bar = document.getElementById('cnbBar');
  if (!bar) return;
  var KEY = 'cookie_notice_choice';
  var analytics = document.getElementById('cnbAnalytics');
  var settings = document.getElementById('cnbSettings');
  var toggle = document.getElementById('cnbToggle');
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* choice lasts until the page is closed */ } }
  function decide(value) {
    save(value);
    bar.hidden = true;
    document.dispatchEvent(new CustomEvent('cookie-consent', { detail: { analytics: value === 'all' || value === 'custom-analytics' } }));
  }
  if (stored()) bar.hidden = true;
  toggle.addEventListener('click', function () {
    var open = settings.hidden;
    settings.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Save my choice' : 'Settings';
    if (!open) decide(analytics.checked ? 'custom-analytics' : 'essential');
  });
  document.getElementById('cnbAccept').addEventListener('click', function () { decide('all'); });
  document.getElementById('cnbDecline').addEventListener('click', function () { decide('essential'); });
})();
