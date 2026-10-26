(function () {
  var track = document.querySelector('.tr-track');
  var top = track.querySelector('.tr-top');
  var bot = track.querySelector('.tr-bot');
  var cue = track.querySelector('.tr-cue');
  var under = track.querySelector('.tr-under');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ease(t) { return t * t * (3 - 2 * t); }
  function update() {
    var r = track.getBoundingClientRect(), max = r.height - window.innerHeight;
    var p = max > 0 ? Math.max(0, Math.min(1, -r.top / max)) : 0;
    var t = ease(Math.max(0, Math.min(1, (p - .1) / .6)));
    if (reduce) t = t > .5 ? 1 : 0;
    var h = window.innerHeight;
    top.style.transform = 'translateY(' + (-t * h * .62) + 'px) rotate(' + (-t * 5) + 'deg)';
    bot.style.transform = 'translateY(' + (t * h * .62) + 'px) rotate(' + (t * 4) + 'deg)';
    cue.style.opacity = p > .05 ? 0 : 1;
    under.style.transform = 'scale(' + (.94 + t * .06) + ')';
    top.style.visibility = bot.style.visibility = t >= 1 && p > .9 ? 'hidden' : 'visible';
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
