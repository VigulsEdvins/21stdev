(function () {
  var DICT = {
    en: { work: 'Work', about: 'About', contact: 'Contact' },
    de: { work: 'Arbeiten', about: 'Über uns', contact: 'Kontakt' },
    es: { work: 'Trabajos', about: 'Nosotros', contact: 'Contacto' }
  };
  Array.prototype.forEach.call(document.querySelectorAll('.lsw-demo'), function (root) {
    if (root.getAttribute('data-lsw-ready')) return;
    root.setAttribute('data-lsw-ready', '1');
    var btn = root.querySelector('.lsw-current');
    var menu = root.querySelector('.lsw-menu');
    var code = root.querySelector('.lsw-code');
    // inside the builder the menu lists the project's own languages and opens the page written in the chosen one
    var host = null;
    try { host = window.parent !== window && window.parent.__edvLangs || null; } catch (e) { host = null; }
    var mine = [];
    try { mine = host ? host.list() : []; } catch (e) { mine = []; }
    if (mine.length > 1) {
      menu.textContent = '';
      mine.forEach(function (l) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option'); li.setAttribute('tabindex', '-1'); li.setAttribute('data-lang', l.code);
        li.setAttribute('aria-selected', String(!!l.here)); li.textContent = l.name;
        menu.appendChild(li);
        if (l.here) code.textContent = l.code.split('-')[0].toUpperCase();
      });
    } else host = null;
    var opts = Array.prototype.slice.call(menu.querySelectorAll('[role=option]'));
    function setOpen(open, focusFirst) {
      btn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      if (open) {
        var sel = opts.filter(function (o) { return o.getAttribute('aria-selected') === 'true'; })[0] || opts[0];
        if (focusFirst) sel.focus();
      }
    }
    function choose(lang) {
      if (host) { host.open(lang); return; }
      var d = DICT[lang] || DICT.en;
      opts.forEach(function (o) { o.setAttribute('aria-selected', String(o.getAttribute('data-lang') === lang)); });
      code.textContent = lang.toUpperCase();
      root.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = d[el.getAttribute('data-i18n')] || el.textContent; });
      var h = root.closest('html') || document.documentElement;
      root.setAttribute('data-lang', lang);
    }
    btn.addEventListener('click', function () { setOpen(menu.hidden, true); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true, true); } });
    opts.forEach(function (o, i) {
      o.addEventListener('click', function () { choose(o.getAttribute('data-lang')); setOpen(false); btn.focus(); });
      o.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.click(); }
        else if (e.key === 'Escape') { setOpen(false); btn.focus(); }
        else if (e.key === 'Tab') setOpen(false);
      });
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!root.contains(e.target)) setOpen(false); });
  });
})();
