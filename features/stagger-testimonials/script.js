/**
 * Stagger Testimonials Controller
 * Author: vaib215 (@vaib215)
 * The cards are real markup in index.html (so names, roles and quotes can be edited); the script filters them,
 * moves the "featured" highlight and offsets every second visible card.
 */
(function () {
  const stage = document.getElementById("staggerStage");
  const grid = document.getElementById("staggerGrid");
  const themeBtn = document.getElementById("btnThemeToggle");
  const filterBtns = document.querySelectorAll(".filter-btn");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".stagger-card"));

  // A photo that fails to load is replaced by the person's initials
  function initialsAvatar(name) {
    const initials = (name || "").split(" ").map((p) => p[0] || "").join("").slice(0, 3);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#4338ca"/><text x="50%" y="55%" fill="white" font-family="sans-serif" font-weight="bold" font-size="28" text-anchor="middle" dominant-baseline="middle">' + initials.replace(/[<>&]/g, "") + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  cards.forEach((card) => {
    const img = card.querySelector(".avatar-img");
    if (img) img.addEventListener("error", () => { img.src = initialsAvatar(card.querySelector("h4") && card.querySelector("h4").textContent); }, { once: true });
    card.addEventListener("click", () => {
      cards.forEach((c) => c.classList.remove("featured"));
      card.classList.add("featured");
    });
  });

  function applyFilter(filter) {
    let shown = 0;
    cards.forEach((card) => {
      const show = filter === "all" || card.dataset.category === filter;
      card.hidden = !show;
      card.classList.toggle("is-offset", show && shown++ % 2 === 1);
    });
    const visible = cards.filter((c) => !c.hidden);
    if (!visible.some((c) => c.classList.contains("featured")) && visible[0]) visible[0].classList.add("featured");
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilter(btn.dataset.filter);
    });
  });

  // "Toggle Theme" swaps this section's background and text colours
  if (themeBtn && stage) themeBtn.addEventListener("click", () => stage.classList.toggle("is-inverted"));

  applyFilter("all");
})();
