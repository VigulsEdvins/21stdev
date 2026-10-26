// Into The Ether - Kinetic Concentric Wave Harmonic System
Array.prototype.forEach.call(document.querySelectorAll('.ether-viewport'), (root) => {
  if (root.dataset.etherReady) return;
  root.dataset.etherReady = '1';
  const canvas = root.querySelector('.ether-canvas');
  const ctx = canvas.getContext('2d');
  const btnPulse = root.querySelector('.ether-btn.primary');
  const btnTheme = root.querySelector('.ether-btn.secondary');
  const themeLabel = root.querySelector('.ether-theme-label');
  const statFps = root.querySelector('.stat-fps');
  const statRipples = root.querySelector('.stat-ripples');

  let width = 0;
  let height = 0;
  let dpr = 1;

  // Ripples & Wave state
  const ringsCount = 14;
  let basePhase = 0;
  const ripples = [];
  const dots = [];

  // Mouse & Interaction
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, isHovering: false };

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    mouse.x = width / 2;
    mouse.y = height / 2;
    mouse.targetX = width / 2;
    mouse.targetY = height / 2;

    initDots();
  }

  function initDots() {
    dots.length = 0;
    const spacing = 32;
    const cols = Math.ceil(width / spacing);
    const rows = Math.ceil(height / spacing);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        dots.push({
          x: i * spacing,
          y: j * spacing,
          baseRadius: 1.2,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  function createRipple(x, y, maxRadius, speed) {
    ripples.push({
      x: x || width / 2,
      y: y || height / 2,
      radius: 10,
      maxRadius: maxRadius || 380,
      speed: speed || 3.5,
      opacity: 0.85
    });
    if (statRipples) {
      statRipples.textContent = String(ringsCount + ripples.length);
    }
  }

  // Audio Synth Pulse using Web Audio API
  let audioCtx = null;
  function playEtherTone() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // Audio autoplay policy graceful fallback
    }
  }

  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.targetX = e.clientX - rect.left;
    mouse.targetY = e.clientY - rect.top;
    mouse.isHovering = true;
  });

  window.addEventListener('pointerleave', () => {
    mouse.targetX = width / 2;
    mouse.targetY = height / 2;
    mouse.isHovering = false;
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    createRipple(x, y, Math.max(width, height) * 0.9, 5);
    playEtherTone();
  });

  if (btnPulse) {
    btnPulse.addEventListener('click', () => {
      createRipple(width / 2, height / 2, Math.max(width, height) * 1.1, 6);
      playEtherTone();
    });
  }

  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const isDark = root.classList.toggle('theme-dark');
      root.classList.toggle('theme-light', !isDark);
      btnTheme.setAttribute('aria-pressed', String(isDark));
      themeLabel.textContent = isDark ? 'Light Theme' : 'Dark Theme';
    });
  }

  // Animation Loop with FPS counter
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;

  function render(time) {
    requestAnimationFrame(render);

    const delta = (time - lastTime) / 1000;
    lastTime = time;

    frameCount++;
    fpsTimer += delta;
    if (fpsTimer >= 0.5) {
      const currentFps = Math.round(frameCount / fpsTimer);
      if (statFps) statFps.textContent = currentFps + ' FPS';
      frameCount = 0;
      fpsTimer = 0;
    }

    basePhase += 0.02;

    // Smooth cursor interpolation
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    ctx.clearRect(0, 0, width, height);

    const isDark = root.classList.contains('theme-dark');
    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Draw Subtle Background Dot Grid
    const dotColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(99, 102, 241, 0.08)';
    ctx.fillStyle = dotColor;
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const dist = Math.hypot(dot.x - mouse.x, dot.y - mouse.y);
      let r = dot.baseRadius;
      if (dist < 180) {
        r += (1 - dist / 180) * 1.4;
      }
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Core Ambient Gradient
    const coreGrad = ctx.createRadialGradient(
      centerX + (mouse.x - centerX) * 0.15,
      centerY + (mouse.y - centerY) * 0.15,
      20,
      centerX,
      centerY,
      Math.min(width, height) * 0.55
    );
    if (isDark) {
      coreGrad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
      coreGrad.addColorStop(0.4, 'rgba(129, 140, 248, 0.12)');
      coreGrad.addColorStop(1, 'rgba(9, 9, 14, 0)');
    } else {
      coreGrad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
      coreGrad.addColorStop(0.4, 'rgba(147, 197, 253, 0.15)');
      coreGrad.addColorStop(1, 'rgba(245, 245, 249, 0)');
    }
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.min(width, height) * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Kinetic Harmonic Concentric Rings
    const maxRadius = Math.min(width, height) * 0.52;
    for (let i = 1; i <= ringsCount; i++) {
      const ringRatio = i / ringsCount;
      const breathing = Math.sin(basePhase + i * 0.45) * 8;
      const baseR = ringRatio * maxRadius + breathing;

      // Parallax offset towards mouse
      const offsetX = (mouse.x - centerX) * 0.06 * ringRatio;
      const offsetY = (mouse.y - centerY) * 0.06 * ringRatio;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX + offsetX, centerY + offsetY, Math.max(0, baseR), 0, Math.PI * 2);

      const ringAlpha = (1 - ringRatio * 0.7) * (isDark ? 0.35 : 0.28);
      ctx.strokeStyle = isDark
        ? 'rgba(165, 180, 252, ' + ringAlpha + ')'
        : 'rgba(99, 102, 241, ' + ringAlpha + ')';
      ctx.lineWidth = i % 3 === 0 ? 1.8 : 1.0;
      if (i % 2 === 0) {
        ctx.setLineDash([4, 6]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Update and Draw Expanding Interactive Ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += r.speed;
      r.opacity -= 0.012;

      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = isDark
        ? 'rgba(199, 210, 254, ' + r.opacity + ')'
        : 'rgba(79, 70, 229, ' + r.opacity + ')';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = isDark ? '#818cf8' : '#4f46e5';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
    }
  }

  requestAnimationFrame(render);
});
