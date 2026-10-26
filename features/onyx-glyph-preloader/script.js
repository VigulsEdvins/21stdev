(function () {
  var gate = document.getElementById('ogGate'), count = document.getElementById('ogCount'), fill = document.getElementById('ogFill');
  var replay = document.getElementById('ogReplay');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = 0;
  function set(v) {
    count.textContent = String(v).padStart(3, '0'); fill.style.width = v + '%'; gate.setAttribute('aria-valuenow', v);
  }
  function play() {
    cancelAnimationFrame(raf);
    gate.classList.remove('is-open', 'is-gone'); set(0);
    var dur = reduce ? 600 : 3200, start = performance.now(), last = 0;
    function step(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var v = Math.round(eased * 100);
      if (v !== last) { last = v; set(v); }
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        setTimeout(function () { gate.classList.add('is-open'); setTimeout(function () { gate.classList.add('is-gone'); }, reduce ? 50 : 1400); }, 350);
      }
    }
    raf = requestAnimationFrame(step);
  }
  replay.addEventListener('click', play);
  play();
})();
