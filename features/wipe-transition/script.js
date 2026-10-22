/**
 * Wipe Transition Controller
 * Author: kevingirelli (@kevingirelli)
 */
(function () {
  const PANELS = {
    overview: {
      tag: "Dashboard &bull; 01",
      title: "Real-time Operations Overview",
      text: "Unified view of your active services, operational health, and real-time distributed telemetry streams across multiple cloud regions.",
      metrics: [
        { val: "99.99%", label: "System Uptime" },
        { val: "1.2ms", label: "Edge Latency" },
        { val: "48.2k", label: "Active Nodes" }
      ]
    },
    performance: {
      tag: "Analytics &bull; 02",
      title: "Sub-millisecond Compute Engines",
      text: "Global distributed worker execution with automatic cache invalidation and zero cold-start latency thresholds.",
      metrics: [
        { val: "420M", label: "Daily Requests" },
        { val: "0.4ms", label: "Cold Start" },
        { val: "98.7%", label: "Cache Hit Rate" }
      ]
    },
    security: {
      tag: "Governance &bull; 03",
      title: "Zero-Trust Encryption Mesh",
      text: "Continuous automated mTLS key rotation, end-to-end cryptographic integrity, and compliance monitoring out of the box.",
      metrics: [
        { val: "256-bit", label: "AES Galois" },
        { val: "0", label: "Vulnerabilities" },
        { val: "SOC 2", label: "Certified" }
      ]
    },
    settings: {
      tag: "Pipelines &bull; 04",
      title: "Instant Global Deployments",
      text: "Git-driven atomic releases with instant rollback capabilities, isolated preview environments, and blue-green canary routing.",
      metrics: [
        { val: "18s", label: "Build Time" },
        { val: "300+", label: "PoP Locations" },
        { val: "1-Click", label: "Instant Rollback" }
      ]
    }
  };

  const OFFSETS = {
    right: ["-100%", "100%"],
    left: ["100%", "-100%"],
    down: ["-100%", "100%"],
    up: ["100%", "-100%"],
  };

  const shutter = document.getElementById("wipeShutter");
  const content = document.getElementById("wipeContent");
  const navTabs = document.querySelectorAll(".nav-tab");
  const toolBtns = document.querySelectorAll(".tool-btn");
  const colorBtns = document.querySelectorAll(".color-btn");

  let currentKey = "overview";
  let currentDir = "right";
  let currentColor = "#6366f1";
  let isTransitioning = false;

  function renderPanel(key) {
    const data = PANELS[key];
    content.innerHTML = `
      <div class="panel-header">
        <span class="panel-tag">${data.tag}</span>
      </div>
      <h3 class="panel-title">${data.title}</h3>
      <p class="panel-text">${data.text}</p>
      <div class="panel-metrics">
        ${data.metrics.map(m => `
          <div class="p-metric">
            <h5>${m.val}</h5>
            <span>${m.label}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function getTransform(dir, offset) {
    return (dir === "left" || dir === "right")
      ? `translate3d(${offset}, 0, 0)`
      : `translate3d(0, ${offset}, 0)`;
  }

  async function triggerWipe(newKey) {
    if (isTransitioning || newKey === currentKey) return;
    isTransitioning = true;
    currentKey = newKey;

    navTabs.forEach(t => t.classList.toggle("active", t.dataset.key === newKey));

    const [enter, leave] = OFFSETS[currentDir];
    shutter.style.backgroundColor = currentColor;

    // Phase 1: Wipe Cover
    const coverAnim = shutter.animate(
      [
        { transform: getTransform(currentDir, enter) },
        { transform: "translate3d(0, 0, 0)" }
      ],
      { duration: 280, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" }
    );

    await coverAnim.finished;

    // Content Swap while fully covered
    renderPanel(newKey);

    // Phase 2: Wipe Reveal
    const revealAnim = shutter.animate(
      [
        { transform: "translate3d(0, 0, 0)" },
        { transform: getTransform(currentDir, leave) }
      ],
      { duration: 280, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" }
    );

    await revealAnim.finished;
    isTransitioning = false;
  }

  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      triggerWipe(tab.dataset.key);
    });
  });

  toolBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      toolBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDir = btn.dataset.dir;
    });
  });

  colorBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      colorBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentColor = btn.dataset.color;
    });
  });

  renderPanel("overview");
})();
