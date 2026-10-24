/**
 * Image Stream Hero — 3D Continuous Vanishing Point Corridor
 * Author: ruixen.ui (@ruixen.ui)
 */
(function () {
  const IMAGES = [
    { src: "/assets/library/photo-1618005182384-a83a8bd57fbe-077a01fd.jpg", color: "#6366f1", title: "Chroma Seascape" },
    { src: "/assets/library/photo-1634017839464-5c339ebe3cb4-647c947c.jpg", color: "#ec4899", title: "Prism Aurora" },
    { src: "/assets/library/photo-1618172193622-ae2d025f4032-656fdbec.jpg", color: "#8b5cf6", title: "Ether Flow" },
    { src: "/assets/library/photo-1635070041078-e363dbe005cb-bf117738.jpg", color: "#06b6d4", title: "Quantum Grade" },
    { src: "/assets/library/photo-1614728263952-84ea256f9679-af306b6f.jpg", color: "#3b82f6", title: "Nebula Stream" },
    { src: "/assets/library/photo-1550751827-4bd374c3f58b-eed9f788.jpg", color: "#10b981", title: "Cyber Mesh" },
    { src: "/assets/library/photo-1541701494587-cb58502866ab-3ddeb83b.jpg", color: "#f59e0b", title: "Liquid Flux" },
    { src: "/assets/library/photo-1508739773434-c26b3d09e071-8451f283.jpg", color: "#f43f5e", title: "Solar Wind" }
  ];

  const PATH = {
    perspective: 30,
    cardWidth: 18,
    cardHeight: 25,
    birthHeight: 2.6,
    exitHeight: 46,
    railBirth: -11,
    railExit: 44,
    fan: 3.3,
    turnBirth: 6,
    turnExit: 28,
    stops: 24,
  };

  const CARDS_PER_RAIL = 7;
  let cycleDuration = 14; // seconds

  function generateKeyframes(dir, name) {
    const steps = [];
    for (let s = 0; s <= PATH.stops; s++) {
      const u = s / PATH.stops;
      const scale = (PATH.birthHeight / PATH.cardHeight) * Math.pow(PATH.exitHeight / PATH.birthHeight, u);
      const z = PATH.perspective * (1 - 1 / scale);
      const rail = PATH.railExit - (PATH.railExit - PATH.railBirth) * Math.pow(1 - u, PATH.fan);
      const turn = PATH.turnBirth + (PATH.turnExit - PATH.turnBirth) * u;
      steps.push(
        `${(u * 100).toFixed(2)}%{transform:translate3d(${(dir * rail).toFixed(2)}cqw,0,${z.toFixed(2)}cqw) rotateY(${(-dir * turn).toFixed(2)}deg);}`
      );
    }
    return `@keyframes ${name} { ${steps.join(" ")} }`;
  }

  // Inject dynamic keyframes into document
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    ${generateKeyframes(-1, "corridor-left")}
    ${generateKeyframes(1, "corridor-right")}
  `;
  document.head.appendChild(styleEl);

  function makeSvgFallback(title, color) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="550" viewBox="0 0 400 550"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="50%" stop-color="${encodeURIComponent(color)}"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="400" height="550" fill="url(%23g)"/><text x="50%" y="50%" fill="white" font-family="monospace" font-size="16" letter-spacing="2" text-anchor="middle">${encodeURIComponent(title)}</text></svg>`;
  }

  function mountRail(container, dir, animName) {
    container.innerHTML = "";
    for (let i = 0; i < CARDS_PER_RAIL; i++) {
      const cardData = IMAGES[(i + (dir > 0 ? 3 : 0)) % IMAGES.length];
      const card = document.createElement("div");
      card.className = "card-item";

      const delay = -((i / CARDS_PER_RAIL) * cycleDuration);
      card.style.animation = `${animName} ${cycleDuration}s cubic-bezier(0.2, 0, 0, 1) infinite`;
      card.style.animationDelay = `${delay.toFixed(3)}s`;

      const fallback = makeSvgFallback(cardData.title, cardData.color);
      card.innerHTML = `
        <img src="${cardData.src}" alt="${cardData.title}" draggable="false" onerror="this.onerror=null; this.src='${fallback}';" />
      `;
      container.appendChild(card);
    }
  }

  const leftRail = document.getElementById("railLeft");
  const rightRail = document.getElementById("railRight");
  mountRail(leftRail, -1, "corridor-left");
  mountRail(rightRail, 1, "corridor-right");

  // Speed Toggle
  const btnSpeed = document.getElementById("btnToggleSpeed");
  let isFast = false;
  if (btnSpeed) {
    btnSpeed.addEventListener("click", () => {
      isFast = !isFast;
      cycleDuration = isFast ? 7 : 14;
      btnSpeed.textContent = isFast ? "Normal Flow" : "Faster Flow";
      mountRail(leftRail, -1, "corridor-left");
      mountRail(rightRail, 1, "corridor-right");
    });
  }
})();
