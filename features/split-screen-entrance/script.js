(function () {
  const curtainTop = document.getElementById('curtainTop');
  const curtainBottom = document.getElementById('curtainBottom');
  const replayBtn = document.getElementById('replayBtn');
  const scrubber = document.getElementById('splitScrubber');

  function applySplit(progressPct) {
    const p = Math.max(0, Math.min(100, Number(progressPct)));
    curtainTop.style.transform = `translate3d(0, -${p}%, 0)`;
    curtainBottom.style.transform = `translate3d(0, ${p}%, 0)`;
  }

  function playEntrance() {
    curtainTop.style.transition = 'none';
    curtainBottom.style.transition = 'none';
    scrubber.value = '0';
    applySplit(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        curtainTop.style.transition = 'transform 1.2s cubic-bezier(0.76, 0, 0.24, 1)';
        curtainBottom.style.transition = 'transform 1.2s cubic-bezier(0.76, 0, 0.24, 1)';
        scrubber.value = '100';
        applySplit(100);
      });
    });
  }

  replayBtn.addEventListener('click', playEntrance);
  scrubber.addEventListener('input', (e) => {
    curtainTop.style.transition = 'none';
    curtainBottom.style.transition = 'none';
    applySplit(e.target.value);
  });


  // Pins the section while the page scrolls past it and reports how far through (0 to 1) the visitor is,
  // so the animation plays through with the page scroll
  function pinRunway(el, screens, onProgress) {
    var run = document.createElement('div');
    run.style.cssText = 'position:relative;height:' + screens * 100 + 'vh';
    var pin = document.createElement('div');
    pin.style.cssText = 'position:sticky;top:0;height:100vh;display:grid;grid-template-columns:minmax(0,1fr);align-items:center';
    el.parentNode.insertBefore(run, el); run.appendChild(pin); pin.appendChild(el);
    el.style.alignSelf = 'stretch'; // fill the pinned screen
    function update() {
      var r = run.getBoundingClientRect(), total = r.height - window.innerHeight;
      onProgress(total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  pinRunway(document.getElementById('curtainStage'), 3, function (v) {
    curtainTop.style.transition = 'none';
    curtainBottom.style.transition = 'none';
    scrubber.value = String(Math.round(v * 100));
    applySplit(v * 100);
  });
})();
