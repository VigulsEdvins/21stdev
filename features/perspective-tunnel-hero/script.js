/**
 * Perspective Tunnel Hero — 3D Spatial Fly-Through Controller
 * Author: Daiwiik Harihar (@daiwiikharihar)
 * 3D Z-axis spatial fly-through where cards burst out of a golden-angle tunnel
 * toward the camera as you scroll.
 */
(function () {
  const IMAGES = [
    { src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80", title: "Chroma I", color: "#6366f1" },
    { src: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80", title: "Prism III", color: "#ec4899" },
    { src: "https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=800&auto=format&fit=crop&q=80", title: "Ether IV", color: "#8b5cf6" },
    { src: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80", title: "Quantum V", color: "#06b6d4" },
    { src: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=800&auto=format&fit=crop&q=80", title: "Nebula VI", color: "#3b82f6" },
    { src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80", title: "Cyber VII", color: "#10b981" },
    { src: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80", title: "Flux VIII", color: "#f59e0b" },
    { src: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80", title: "Aether IX", color: "#f43f5e" },
    { src: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80", title: "Chroma X", color: "#a855f7" }
  ];

  const stageEl = document.getElementById("tunnelStage");
  const planeEl = document.getElementById("tunnelPlane");
  const anchorEl = document.getElementById("tunnelAnchor");
  const promptEl = document.getElementById("scrollPrompt");
  const rangeEl = document.getElementById("progressRange");
  const resetBtn = document.getElementById("btnReset");
  const autoPlayBtn = document.getElementById("btnAutoPlay");

  let stage = {
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768
  };

  let targetProgress = 0;
  let currentProgress = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let currentPointerX = 0;
  let currentPointerY = 0;
  let isAutoPlaying = false;
  let isDragging = false;
  let dragStartY = 0;
  let dragStartProgress = 0;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function makeFallbackSvg(title, color) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="50%" stop-color="${encodeURIComponent(color)}"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="400" height="500" fill="url(%23g)"/><circle cx="200" cy="200" r="100" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/><text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="monospace" font-size="20" letter-spacing="4">${encodeURIComponent(title)}</text></svg>`;
  }

  // Precompute Golden-Angle Tunnel distribution
  const cards = IMAGES.map((item, i) => {
    const goldenAngle = i * 137.5 * (Math.PI / 180);
    const radiusFactorX = 0.28 + (i % 3) * 0.08;
    const radiusFactorY = 0.26 + (i % 2) * 0.09;
    const rotationZ = (i % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 2);

    const cardEl = document.createElement("div");
    cardEl.className = "tunnel-card";
    cardEl.style.zIndex = String(i + 1);

    const fallbackSrc = makeFallbackSvg(item.title, item.color);
    cardEl.innerHTML = `
      <div class="card-inner">
        <img class="card-img" src="${item.src}" alt="${item.title}" draggable="false" onerror="this.onerror=null; this.src='${fallbackSrc}';" />
        <div class="card-scrim">
          <span class="card-title">${item.title}</span>
        </div>
      </div>
    `;

    cardEl.addEventListener("click", () => {
      // Focus this card in tunnel
      const staggerSpan = 0.55;
      const start = (i / IMAGES.length) * (1 - staggerSpan);
      targetProgress = clamp(start + staggerSpan * 0.5, 0, 1);
    });

    planeEl.appendChild(cardEl);

    return {
      el: cardEl,
      item,
      angleCos: Math.cos(goldenAngle),
      angleSin: Math.sin(goldenAngle),
      radiusFactorX,
      radiusFactorY,
      rotationZ,
      index: i
    };
  });

  function updateDimensions() {
    stage.width = window.innerWidth;
    stage.height = window.innerHeight;
    stage.isMobile = window.innerWidth < 768;
  }
  window.addEventListener("resize", updateDimensions);

  // Wheel interaction on stage
  stageEl.addEventListener("wheel", (e) => {
    isAutoPlaying = false;
    updateAutoPlayBtn();
    const delta = e.deltaY * 0.00085;
    targetProgress = clamp(targetProgress + delta, 0, 1);
  }, { passive: true });

  // Pointer move parallax
  window.addEventListener("pointermove", (e) => {
    targetPointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetPointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // Drag interaction
  stageEl.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".tunnel-controls")) return;
    isDragging = true;
    dragStartY = e.clientY;
    dragStartProgress = targetProgress;
    isAutoPlaying = false;
    updateAutoPlayBtn();
    try { stageEl.setPointerCapture(e.pointerId); } catch (_) {}
  });

  stageEl.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dy = dragStartY - e.clientY;
    targetProgress = clamp(dragStartProgress + dy * 0.002, 0, 1);
  });

  const stopDrag = (e) => {
    if (isDragging) {
      isDragging = false;
      try { stageEl.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };
  stageEl.addEventListener("pointerup", stopDrag);
  stageEl.addEventListener("pointercancel", stopDrag);

  // Controls
  if (rangeEl) {
    rangeEl.addEventListener("input", (e) => {
      isAutoPlaying = false;
      updateAutoPlayBtn();
      targetProgress = parseFloat(e.target.value) / 100;
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      targetProgress = 0;
      isAutoPlaying = false;
      updateAutoPlayBtn();
    });
  }

  function updateAutoPlayBtn() {
    if (!autoPlayBtn) return;
    autoPlayBtn.textContent = isAutoPlaying ? "Pause" : "Auto Fly";
    autoPlayBtn.style.borderColor = isAutoPlaying ? "rgba(99, 102, 241, 0.8)" : "";
    autoPlayBtn.style.color = isAutoPlaying ? "#818cf8" : "";
  }

  if (autoPlayBtn) {
    autoPlayBtn.addEventListener("click", () => {
      isAutoPlaying = !isAutoPlaying;
      if (isAutoPlaying && targetProgress >= 0.99) {
        targetProgress = 0;
        currentProgress = 0;
      }
      updateAutoPlayBtn();
    });
  }

  // Animation Loop
  function tick() {
    if (isAutoPlaying) {
      targetProgress += 0.0018;
      if (targetProgress > 1) {
        targetProgress = 0;
        currentProgress = 0;
      }
    }

    currentProgress = lerp(currentProgress, targetProgress, 0.08);
    currentPointerX = lerp(currentPointerX, targetPointerX, 0.06);
    currentPointerY = lerp(currentPointerY, targetPointerY, 0.06);

    if (rangeEl && !isDragging) {
      rangeEl.value = (currentProgress * 100).toFixed(1);
    }

    // Anchor Typography Animation
    if (anchorEl) {
      const titleScale = 0.7 + currentProgress * 0.65;
      let titleOpacity = 1;
      if (currentProgress < 0.12) {
        titleOpacity = lerp(0.25, 1, currentProgress / 0.12);
      } else if (currentProgress > 0.85) {
        titleOpacity = lerp(1, 0, (currentProgress - 0.85) / 0.15);
      }
      anchorEl.style.transform = `scale(${titleScale.toFixed(3)})`;
      anchorEl.style.opacity = Math.max(0, titleOpacity).toFixed(3);
    }

    // Scroll Prompt Animation
    if (promptEl) {
      const promptOpacity = currentProgress < 0.12 ? (1 - currentProgress / 0.12) : 0;
      promptEl.style.opacity = Math.max(0, promptOpacity).toFixed(3);
    }

    // Cards Flight in 3D Space
    const total = cards.length;
    const staggerSpan = 0.55;
    const farZ = stage.isMobile ? -1200 : -1700;
    const nearZ = stage.isMobile ? 350 : 500;
    const cardWidth = stage.isMobile
      ? Math.max(130, Math.min(180, stage.width * 0.38))
      : Math.max(180, Math.min(270, stage.width * 0.18));
    const panStrength = stage.isMobile ? 20 : 45;

    for (let i = 0; i < total; i++) {
      const card = cards[i];
      const start = (card.index / total) * (1 - staggerSpan);
      const end = start + staggerSpan;

      const localProgress = clamp((currentProgress - start) / (end - start), 0, 1);
      const z = farZ + (nearZ - farZ) * localProgress;

      // Opacity envelope: [0, 0.18, 0.82, 0.98] -> [0, 1, 1, 0]
      let opacity = 0;
      if (localProgress <= 0.18) {
        opacity = localProgress / 0.18;
      } else if (localProgress <= 0.82) {
        opacity = 1;
      } else if (localProgress <= 0.98) {
        opacity = 1 - (localProgress - 0.82) / 0.16;
      }

      const baseX = card.angleCos * (stage.width * card.radiusFactorX);
      const baseY = card.angleSin * (stage.height * card.radiusFactorY);
      const offsetX = baseX - currentPointerX * panStrength;
      const offsetY = baseY - currentPointerY * panStrength;

      card.el.style.width = `${cardWidth}px`;
      card.el.style.opacity = opacity.toFixed(3);
      card.el.style.transform = `translate3d(calc(-50% + ${offsetX.toFixed(1)}px), calc(-50% + ${offsetY.toFixed(1)}px), ${z.toFixed(1)}px) rotateZ(${card.rotationZ}deg)`;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
