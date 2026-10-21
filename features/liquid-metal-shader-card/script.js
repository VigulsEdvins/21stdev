(function () {
  const card = document.getElementById('metalCard');
  const canvas = document.getElementById('metalCanvas');
  const ctx = canvas.getContext('2d');
  const w = 120;
  const h = 75;
  canvas.width = w;
  canvas.height = h;

  let mx = 0.5;
  let my = 0.5;
  let t = 0;

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    mx = (e.clientX - rect.left) / rect.width;
    my = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - my) * 16;
    const ry = (mx - 0.5) * 16;
    card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg)';
  });

  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  function render() {
    t += 0.035;
    let p = 0;
    for (let y = 0; y < h; y++) {
      const ny = y / h;
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        const dx = nx - mx;
        const dy = ny - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wave = Math.sin(dist * 22 - t * 2.2) + Math.cos((nx * 6 + ny * 5) + t);
        const r = 135 + Math.sin(wave * 2.1 + 0.2) * 110;
        const g = 135 + Math.sin(wave * 2.1 + 2.1) * 110;
        const b = 155 + Math.sin(wave * 2.1 + 4.2) * 100;
        data[p++] = r;
        data[p++] = g;
        data[p++] = b;
        data[p++] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
