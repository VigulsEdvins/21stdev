(function () {
  var foot = document.querySelector('.bw-foot');
  var beam = foot.querySelector('.bw-beam');
  if (!('IntersectionObserver' in window)) return;
  // pause the beam animation while the footer is offscreen
  new IntersectionObserver(function (e) {
    beam.style.animationPlayState = e[0].isIntersecting ? 'running' : 'paused';
  }).observe(foot);
})();
