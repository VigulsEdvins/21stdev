/**
 * Testimonial v2 Controller
 * Author: avanishverma4 (@avanishverma4)
 */
(function () {
  const TESTIMONIALS = [
    {
      id: "1",
      name: "Sarah Jenkins",
      title: "Chief Design Officer &bull; Stratos Systems",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
      quote: "Integrating these micro-interactions into our design system eliminated months of back-and-forth between design and engineering teams.",
      metric: "4.8x",
      metricLabel: "Faster Dev Velocity"
    },
    {
      id: "2",
      name: "Alexandre Moreau",
      title: "Lead Frontend Engineer &bull; Luminary AI",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
      quote: "Clean code structure, zero dependency bloat, and instant copy-paste usability. Exactly how modern web blocks should be packaged.",
      metric: "99.4%",
      metricLabel: "Satisfaction Rate"
    },
    {
      id: "3",
      name: "Chloe Zhao",
      title: "Product Growth Lead &bull; Apex Scale",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
      quote: "The visual polish and tactile spring curves boosted user engagement across all key onboarding steps.",
      metric: "+38%",
      metricLabel: "Conversion Lift"
    }
  ];

  let currentIdx = 0;
  const quoteBody = document.getElementById("quoteBody");
  const clientAvatar = document.getElementById("clientAvatar");
  const clientName = document.getElementById("clientName");
  const clientTitle = document.getElementById("clientTitle");
  const metricVal = document.getElementById("metricVal");
  const metricLabel = document.getElementById("metricLabel");
  const dotsRow = document.getElementById("dotsRow");

  function makeAvatarFallback(name) {
    const initials = name.split(" ").map(p => p[0]).join("");
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="%236366f1"/><text x="50%" y="55%" fill="white" font-family="sans-serif" font-weight="bold" font-size="28" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  }

  function updateSlide(idx) {
    currentIdx = idx;
    const item = TESTIMONIALS[currentIdx];

    quoteBody.style.opacity = "0.2";
    setTimeout(() => {
      quoteBody.textContent = item.quote;
      clientName.textContent = item.name;
      clientTitle.innerHTML = item.title;
      metricVal.textContent = item.metric;
      metricLabel.textContent = item.metricLabel;

      const fallback = makeAvatarFallback(item.name);
      clientAvatar.onerror = () => { clientAvatar.src = fallback; };
      clientAvatar.src = item.avatar;

      quoteBody.style.opacity = "1";
    }, 150);

    // Update dots
    document.querySelectorAll(".dot-btn").forEach((dot, i) => {
      dot.classList.toggle("active", i === idx);
    });
  }

  // Populate Dots
  dotsRow.innerHTML = "";
  TESTIMONIALS.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `dot-btn ${i === 0 ? "active" : ""}`;
    dot.setAttribute("aria-label", `Slide ${i + 1}`);
    dot.addEventListener("click", () => updateSlide(i));
    dotsRow.appendChild(dot);
  });

  // Autoplay
  setInterval(() => {
    updateSlide((currentIdx + 1) % TESTIMONIALS.length);
  }, 6000);

  updateSlide(0);
})();
