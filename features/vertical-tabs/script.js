/**
 * Vertical Tabs Controller
 * Author: 0xUrvish (@0xUrvish)
 */
(function () {
  const SERVICES = [
    {
      id: "01",
      title: "Design",
      description: "Crafting intuitive and engaging user interfaces that captivate and convert.",
      image: "/assets/library/photo-1507238691740-187a5b1d37b8-72990609.jpg"
    },
    {
      id: "02",
      title: "Development",
      description: "Building robust and scalable solutions tailored to your unique requirements.",
      image: "/assets/library/photo-1581291518857-4e27b48ff24e-3ad8d0f9.jpg"
    },
    {
      id: "03",
      title: "Branding",
      description: "Defining your brand's visual identity and voice for a lasting impression.",
      image: "/assets/library/photo-1555066931-4365d14bab8c-c55b9bbf.jpg"
    }
  ];

  const AUTO_PLAY_DURATION = 5000;
  let activeIndex = 0;
  let isPaused = false;
  let timerStart = Date.now();
  let rafId = null;

  const tabList = document.getElementById("tabList");
  const galleryImg = document.getElementById("galleryImg");
  const galleryCard = document.getElementById("galleryCard");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");

  function makeImageFallback(title) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="800" height="600" fill="url(%23g)"/><text x="50%" y="50%" fill="white" font-family="sans-serif" font-weight="bold" font-size="36" text-anchor="middle">${encodeURIComponent(title)}</text></svg>`;
  }

  // Populate Tabs
  const tabElements = SERVICES.map((service, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `tab-btn ${index === 0 ? "active" : ""}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", index === 0 ? "true" : "false");

    btn.innerHTML = `
      <div class="tab-indicator">
        <div class="tab-indicator-fill" style="height: 0%;"></div>
      </div>
      <span class="tab-num">/${service.id}</span>
      <div class="tab-text">
        <span class="tab-title">${service.title}</span>
        <p class="tab-desc">${service.description}</p>
      </div>
    `;

    btn.addEventListener("click", () => {
      setActiveTab(index);
    });

    tabList.appendChild(btn);
    return {
      btn,
      fill: btn.querySelector(".tab-indicator-fill")
    };
  });

  function updateGalleryImage() {
    const current = SERVICES[activeIndex];
    galleryImg.style.opacity = "0.2";
    galleryImg.style.transform = "scale(1.05)";

    const fallback = makeImageFallback(current.title);
    galleryImg.onerror = () => { galleryImg.src = fallback; };
    galleryImg.src = current.image;

    setTimeout(() => {
      galleryImg.style.opacity = "1";
      galleryImg.style.transform = "scale(1)";
    }, 50);
  }

  function setActiveTab(index) {
    activeIndex = index;
    timerStart = Date.now();

    tabElements.forEach((tab, i) => {
      const isActive = i === index;
      tab.btn.classList.toggle("active", isActive);
      tab.btn.setAttribute("aria-selected", isActive ? "true" : "false");
      if (!isActive) {
        tab.fill.style.height = "0%";
      }
    });

    updateGalleryImage();
  }

  function handleNext() {
    setActiveTab((activeIndex + 1) % SERVICES.length);
  }

  function handlePrev() {
    setActiveTab((activeIndex - 1 + SERVICES.length) % SERVICES.length);
  }

  if (btnNext) btnNext.addEventListener("click", handleNext);
  if (btnPrev) btnPrev.addEventListener("click", handlePrev);

  if (galleryCard) {
    galleryCard.addEventListener("mouseenter", () => { isPaused = true; });
    galleryCard.addEventListener("mouseleave", () => {
      isPaused = false;
      timerStart = Date.now();
    });
  }

  // Animation Loop for Auto Progress
  function loop() {
    if (!isPaused) {
      const elapsed = Date.now() - timerStart;
      const progress = Math.min(1, elapsed / AUTO_PLAY_DURATION);
      const activeTab = tabElements[activeIndex];
      if (activeTab) {
        activeTab.fill.style.height = `${(progress * 100).toFixed(1)}%`;
      }

      if (elapsed >= AUTO_PLAY_DURATION) {
        handleNext();
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  setActiveTab(0);
  loop();
})();
