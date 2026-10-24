/**
 * Hyperiux Product Storyline — Horizontal Scroll Timeline Controller
 * Built for 21st.local Vault
 * Inspired by Hyperiux Vault (@hyperiux) Product Timeline
 */
(function () {
  const topMilestones = [
    {
      id: "2020-march",
      year: "2020",
      month: "March",
      content: "Signal research turns scattered notes into a clear product thesis."
    },
    {
      id: "2021-july",
      year: "2021",
      month: "July",
      content: "Founding release ships with the first live customer journeys."
    },
    {
      id: "2023-april",
      year: "2023",
      month: "April",
      content: "Automation layer connects insight, publishing, and sales motion."
    },
    {
      id: "2026-may",
      year: "2026",
      month: "May",
      content: "New markets open with localized launches and faster onboarding."
    }
  ];

  const bottomMilestones = [
    {
      id: "2020-november",
      year: "2020",
      month: "November",
      content: "Prototype sprint validates the experience with real operators."
    },
    {
      id: "2022-october",
      year: "2022",
      month: "October",
      content: "Community feedback reshapes the roadmap into sharper releases."
    },
    {
      id: "2025-september",
      year: "2025",
      month: "September",
      content: "Companion mobile workflows make the timeline travel-ready."
    }
  ];

  const trackWrap = document.getElementById("trackWrap");
  const slider = document.getElementById("timelineSlider");
  const railLineActive = document.getElementById("railLineActive");
  const topWrap = document.getElementById("topMilestonesWrap");
  const bottomWrap = document.getElementById("bottomMilestonesWrap");
  const progressInput = document.getElementById("timelineProgress");
  const btnThemeToggle = document.getElementById("btnThemeToggle");
  const btnReset = document.getElementById("btnReset");
  const btnAutoScroll = document.getElementById("btnAutoScroll");

  let targetProgress = 0; // 0 to 1
  let currentProgress = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartProgress = 0;
  let isAutoScrolling = false;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Populate Top Milestones
  const topElements = topMilestones.map((item, idx) => {
    const el = document.createElement("div");
    el.className = "milestone-item";
    el.id = `top-${item.id}`;
    el.innerHTML = `
      <div class="stem-connector">
        <div class="stem-dot"></div>
        <div class="stem-line"></div>
      </div>
      <div class="milestone-content">
        <h4 class="milestone-date">${item.year} ${item.month}</h4>
        <p class="milestone-desc">${item.content}</p>
      </div>
    `;
    topWrap.appendChild(el);
    return {
      el,
      dot: el.querySelector(".stem-dot"),
      line: el.querySelector(".stem-line"),
      // Trigger threshold along the journey
      threshold: 0.12 + idx * 0.24
    };
  });

  // Populate Bottom Milestones
  const bottomElements = bottomMilestones.map((item, idx) => {
    const el = document.createElement("div");
    el.className = "milestone-item";
    el.id = `bottom-${item.id}`;
    el.innerHTML = `
      <div class="stem-connector">
        <div class="stem-line"></div>
        <div class="stem-dot"></div>
      </div>
      <div class="milestone-content">
        <h4 class="milestone-date">${item.year} ${item.month}</h4>
        <p class="milestone-desc">${item.content}</p>
      </div>
    `;
    bottomWrap.appendChild(el);
    return {
      el,
      dot: el.querySelector(".stem-dot"),
      line: el.querySelector(".stem-line"),
      // Trigger threshold along the journey
      threshold: 0.24 + idx * 0.26
    };
  });

  const allItems = [...topElements, ...bottomElements];

  // Drag Interaction
  trackWrap.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button") || e.target.closest("input")) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartProgress = targetProgress;
    isAutoScrolling = false;
    updateAutoScrollBtn();
    try { trackWrap.setPointerCapture(e.pointerId); } catch (_) {}
  });

  trackWrap.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = dragStartX - e.clientX;
    const maxScroll = Math.max(1, slider.scrollWidth - window.innerWidth + 200);
    targetProgress = clamp(dragStartProgress + (dx / maxScroll), 0, 1);
  });

  const stopDrag = (e) => {
    if (isDragging) {
      isDragging = false;
      try { trackWrap.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };
  trackWrap.addEventListener("pointerup", stopDrag);
  trackWrap.addEventListener("pointercancel", stopDrag);

  // Wheel / Trackpad Scroll
  trackWrap.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      isAutoScrolling = false;
      updateAutoScrollBtn();
      targetProgress = clamp(targetProgress + e.deltaX * 0.0006, 0, 1);
    }
  }, { passive: false });

  // Progress input scrubber
  if (progressInput) {
    progressInput.addEventListener("input", (e) => {
      isAutoScrolling = false;
      updateAutoScrollBtn();
      targetProgress = parseFloat(e.target.value) / 100;
    });
  }

  // Reset Button
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      targetProgress = 0;
      isAutoScrolling = false;
      updateAutoScrollBtn();
    });
  }

  // Theme Toggle Button
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", () => {
      const current = document.body.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      document.body.setAttribute("data-theme", next);
    });
  }

  // Auto Scroll Toggle
  function updateAutoScrollBtn() {
    if (!btnAutoScroll) return;
    btnAutoScroll.textContent = isAutoScrolling ? "Pause" : "Auto Scroll";
    btnAutoScroll.style.borderColor = isAutoScrolling ? "var(--active-color)" : "";
    btnAutoScroll.style.color = isAutoScrolling ? "var(--active-color)" : "";
  }

  if (btnAutoScroll) {
    btnAutoScroll.addEventListener("click", () => {
      isAutoScrolling = !isAutoScrolling;
      if (isAutoScrolling && targetProgress >= 0.99) {
        targetProgress = 0;
        currentProgress = 0;
      }
      updateAutoScrollBtn();
    });
  }

  // Render & Animation Loop
  function tick() {
    if (isAutoScrolling) {
      targetProgress += 0.0014;
      if (targetProgress > 1) {
        targetProgress = 0;
        currentProgress = 0;
      }
    }

    currentProgress = lerp(currentProgress, targetProgress, 0.08);

    // Max translation width
    const maxScroll = Math.max(0, slider.scrollWidth - window.innerWidth + 120);
    const scrollX = currentProgress * maxScroll;
    slider.style.transform = `translateX(-${scrollX.toFixed(1)}px)`;

    // Active line expansion
    const linePercent = clamp(currentProgress * 105, 0, 100);
    if (railLineActive) {
      railLineActive.style.width = `${linePercent.toFixed(1)}%`;
    }

    if (progressInput && !isDragging) {
      progressInput.value = (currentProgress * 100).toFixed(1);
    }

    // Milestones dynamic stems & reveal states
    allItems.forEach((item) => {
      // Progress relative to milestone position
      const reach = (currentProgress - item.threshold) / 0.12;
      const factor = clamp(reach, 0, 1);

      if (factor > 0) {
        item.el.classList.add("active");
        item.line.style.height = `${(factor * 94).toFixed(1)}%`;
        item.dot.style.transform = item.el.closest(".row-top")
          ? `translate(-50%, -50%) scale(${factor.toFixed(2)})`
          : `translate(-50%, 50%) scale(${factor.toFixed(2)})`;
      } else {
        item.el.classList.remove("active");
        item.line.style.height = "0%";
        item.dot.style.transform = item.el.closest(".row-top")
          ? "translate(-50%, -50%) scale(0)"
          : "translate(-50%, 50%) scale(0)";
      }
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
