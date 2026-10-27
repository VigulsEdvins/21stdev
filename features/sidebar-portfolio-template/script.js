(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.sf-nav a'));
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var i = secs.indexOf(e.target);
      links.forEach(function (l, k) { l.classList.toggle('is-on', k === i); });
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  secs.forEach(function (s) { s && io.observe(s); });
})();
