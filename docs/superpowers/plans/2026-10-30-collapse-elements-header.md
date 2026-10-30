# Collapse the Elements header while scrolling

**What:** In the builder's Elements tab, scrolling the card list down hides the title, view toggle, scope pills, search, filters and category pills. Only the "Target Section" banner stays. Scrolling up (or reaching the top) shows everything again.

**Why:** The header takes about half the sidebar height, leaving little room to browse cards.

**How:** `elements-catalog.js` listens to scroll on `#elementsCatalogScroll` and toggles `is-compact` on `.elements-catalog-header`. A small delta threshold stops flicker, because hiding the header resizes the scroller. CSS in `builder.css` hides every header child except the banner when compact.
