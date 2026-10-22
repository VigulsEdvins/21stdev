/**
 * Stagger Testimonials Controller
 * Author: vaib215 (@vaib215)
 */
(function () {
  const TESTIMONIALS = [
    {
      id: "1",
      name: "Elena Rostova",
      role: "Head of Product",
      company: "Veloce Labs",
      category: "leadership",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      quote: "The subtle attention to physics and tactile feedback transformed our user retention. It feels like software built by craftsmen.",
      rating: 5,
      featured: true
    },
    {
      id: "2",
      name: "Marcus Vance",
      role: "Design Architect",
      company: "Monolith Media",
      category: "engineering",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
      quote: "Stands entirely apart from boring quote grids. The staggered layout gives every testimonial its own breathing room.",
      rating: 5
    },
    {
      id: "3",
      name: "Aria Chen",
      role: "Founder & CEO",
      company: "Hyperion AI",
      category: "leadership",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
      quote: "Integrated directly into our landing page within an hour. Zero unnecessary motion weight, just pure responsive elegance.",
      rating: 5
    },
    {
      id: "4",
      name: "Julian Thorne",
      role: "VP Engineering",
      company: "Synthesis Cloud",
      category: "engineering",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
      quote: "Our customer conversion jumped by 24% after replacing static cards with this staggered dynamic review section.",
      rating: 5
    }
  ];

  const grid = document.getElementById("staggerGrid");
  const themeBtn = document.getElementById("btnThemeToggle");
  const filterBtns = document.querySelectorAll(".filter-btn");

  let activeId = "1";
  let activeFilter = "all";

  function makeAvatarFallback(name) {
    const initials = name.split(" ").map(p => p[0]).join("");
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="%234338ca"/><text x="50%" y="55%" fill="white" font-family="sans-serif" font-weight="bold" font-size="28" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  }

  function renderCards() {
    grid.innerHTML = "";
    const filtered = TESTIMONIALS.filter(item => activeFilter === "all" || item.category === activeFilter);

    filtered.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = `stagger-card card-staggered ${item.id === activeId ? "featured" : ""}`;
      card.id = `card-${item.id}`;

      const fallback = makeAvatarFallback(item.name);
      card.innerHTML = `
        <div class="card-author">
          <img class="avatar-img" src="${item.avatar}" alt="${item.name}" onerror="this.onerror=null; this.src='${fallback}';" />
          <div class="author-info">
            <h4>${item.name}</h4>
            <p>${item.role} &bull; ${item.company}</p>
          </div>
        </div>
        <div class="star-rating">${"★".repeat(item.rating)}</div>
        <p class="quote-text">&ldquo;${item.quote}&rdquo;</p>
      `;

      card.addEventListener("click", () => {
        activeId = item.id;
        document.querySelectorAll(".stagger-card").forEach(c => c.classList.remove("featured"));
        card.classList.add("featured");
      });

      grid.appendChild(card);
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderCards();
    });
  });

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.body.getAttribute("data-theme") || "dark";
      document.body.setAttribute("data-theme", current === "dark" ? "light" : "dark");
    });
  }

  renderCards();
})();
