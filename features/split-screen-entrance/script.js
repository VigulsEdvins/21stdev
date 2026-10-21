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

  setTimeout(playEntrance, 220);
})();
