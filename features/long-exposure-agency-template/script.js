(function () {
  var root = document.currentScript ? document.currentScript.parentNode : document;
  var burger = document.querySelector('.ha-burger');
  var menu = document.getElementById('ha-menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('ha-open');
      burger.setAttribute('aria-expanded', String(open));
    });
  }
  var items = document.querySelectorAll('.ha-card, .ha-steps li, .ha-h2');
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('ha-in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  items.forEach(function (el) { el.classList.add('ha-reveal'); io.observe(el); });
})();
