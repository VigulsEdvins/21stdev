# Local 21st.dev Feature & Design Registry — Design Specification

**Date:** 2026-10-21  
**Project Directory:** `/home/edvins/features-for-web/web-for-options`  
**Source Repositories Analyzed:** `betteroff`, `carousel-gallery-play`, `vivmgmt`, `photo-caroulsel`, and `https://21st.dev`

---

## 1. Intent & Why

The goal is to build a local, self-contained **Component, Feature, and Design Vault** modeled after **21st.dev** inside `/home/edvins/features-for-web/web-for-options`.

Instead of generating generic AI text prompts or burying features inside monolithic multi-thousand-line websites, **every single feature and design is pre-extracted into a 100% functional, standalone, plug-and-play code bundle**. 

This enables two frictionless workflows:
1. **Using a feature in a new project (Human or Agent):** Browse the catalog in **21st.dev Grid Mode** or **IDE Split-Screen Workbench Mode**, interact with the live preview across Desktop/Tablet/Mobile viewports, and copy the complete, working HTML/CSS/JS/React source code—or tell an AI agent: *"Take feature `<slug>` from `/home/edvins/features-for-web/web-for-options/features/<slug>` and implement it here."*
2. **Adding a new feature or design (via Agent or UI):** Drop a new folder into `features/<slug>/` with working code and register it in `registry.json` (or use the built-in **"Add Feature / Design"** creator modal in the web app, which persists to `localStorage` + exports updated `registry.json` / folder bundles).

---

## 2. Analysis of 21st.dev & How It Works

### Core Mechanics of 21st.dev
1. **Code Ownership Registry (Not an npm Dependency):** Components are distributed as raw, editable source files copied directly into the developer's repository rather than locked behind a versioned library.
2. **Visual-First Live Catalog:** Dark-mode aesthetic (`#09090b` Zinc-950 surface, subtle `1px` borders `rgba(255,255,255,0.08)`, OKLCH radial ambient glows, smooth card-to-modal view transitions) where every card renders a live interactive preview or kinetic visual preview.
3. **Multi-Dimensional Taxonomy:** Organized into top-level collections (**Components / Features**, **Full Templates & CMS**, **21st.dev Crafted UI & Shaders**) and filterable by category pills (*3D & Carousels*, *Scroll & Parallax*, *Navigation & Drawers*, *Cursors & Micro-interactions*, *Audio & Media*, *Galleries & Grids*, *Shaders & Backgrounds*) and source project tags (`betteroff`, `carousel-gallery-play`, `vivmgmt`, `photo-caroulsel`, `21st-crafted`).
4. **Machine-Readable Discovery:** Exposes a structured `registry.json` and `AGENT_GUIDE.md` so any coding agent can deterministically discover, read, extract, or append features without guessing file paths.

---

## 3. Goals, Non-Goals & Anti-Goals

### Goals
- **100% Functional Standalone Features:** Every feature in `features/<slug>/` must run out-of-the-box with zero broken links, zero missing assets, and zero unrelated code bloat.
- **Dual Workspace Modes (Hybrid Option A + B):**
  - **Catalog Grid View (21st.dev Style):** Hero header, search (`⌘K`), source/category filter pills, live interactive card grid, and slide-over Inspector Modal.
  - **IDE Workbench View (Split-Screen Style):** Left collapsible file/category tree (`betteroff`, `vivmgmt`, `carousel-gallery-play`, `photo-caroulsel`, `21st-crafted`), center live interactive stage with viewport sizer (`100%`, `768px`, `375px`), and right code inspector panel (`Combined Single-File`, `index.html`, `style.css`, `script.js`, and `component.tsx` where applicable).
- **Complete Extraction from `features-for-web` Subfolders:** Extract all major interactive features, physics engines, galleries, and full templates from `betteroff`, `carousel-gallery-play`, `vivmgmt`, and `photo-caroulsel`, plus signature 21st.dev UI blocks.
- **Direct Code & File Actions:** One-click buttons to **Copy Combined Single-File HTML**, **Copy HTML / CSS / JS / TSX**, **Download Standalone `.html` File**, and **Copy Exact Local Folder Path** (`/home/edvins/features-for-web/web-for-options/features/<slug>`).
- **Agent-Ready Architecture:** Clear `registry.json` schema and `AGENT_GUIDE.md` instructions at the root of `web-for-options` so any future agent session immediately knows how to read or add features.

### Non-Goals
- Cloud authentication, paid tiers, or external database dependencies (must run 100% locally offline/online via static HTTP server or direct browser access).

### Anti-Goals
- **No AI Prompt Fluff:** Do NOT replace working code with "prompts to generate code". Every feature must already be fully coded, styled, and interactive.
- **No Broken Asset Paths:** Extracted features must use self-contained local assets, inline SVGs, procedural canvas art, or symlinked/copied local media so they never break when copied into a new project.

---

## 4. Catalog of Features & Designs to Extract (26 Standalone Items)

### A. From `photo-caroulsel` (`code.txt` & `code2.txt`)
Both components will include their original React TypeScript (`.tsx`) source AND a complete, 100% working Vanilla HTML/CSS/JS standalone port so they run live in the browser without a React build step:
1. **`works-wheel-3d`** — *Works Wheel 3D Ring-to-Drum Portfolio Index*: At rest, cards sit tangent to a circular ring around a central title; scrolling or dragging smoothly unfolds the ring into a 3D perspective vertical drum with horizontal bow curvature (`BOW = 1.82`, `DRUM = 2.22`, `LENS = 2.7`) and right-hand index ticks.
2. **`polaroid-string-carousel`** — *Polaroid Sagging String & Breeze Physics Carousel*: Instant photo prints pegged to a sagging catenary parabola string (`stringY`). Dragging, clicking, or arrow keys slide prints along the string with damped spring physics (`springStep`), velocity-driven pendulum swing (`swingStep`), ambient breeze oscillation, and procedural seeded canvas landscapes (`dawn`, `alpine`, `dusk`, `mist`).

### B. From `carousel-gallery-play`
3. **`cylindrical-3d-carousel`** — *3D Cylindrical Drag & Momentum Carousel*: Multi-panel 3D cylinder (`rotateY` + `translateZ` radius math) with pointer drag inertia, scroll-wheel velocity, and active card spotlight.
4. **`cursor-image-trail`** — *Interactive Velocity Cursor Image Trail*: Spawns decaying, momentum-thrown trail images along the user's cursor trajectory with rotation and scale physics.
5. **`client-logo-marquee`** — *Infinite Dual-Direction Partner Logo Marquee*: Smooth hardware-accelerated infinite CSS/JS marquee with hover speed modulation and edge fade masks.
6. **`athletes-filter-showcase`** — *Filterable Roster & Interactive Portrait Grid*: Category tag filtering (`All`, `Exclusive`, `Football`, `Creative`) with animated layout transitions and hover portrait reveals.
7. **`custom-magnetic-cursor`** — *Custom Dual-Ring Follower & Magnetic Target Cursor*: Smooth lerp-driven cursor follower that morphs and snaps to interactive buttons and cards.
8. **`faq-accordion-smooth`** — *Editorial Animated FAQ Accordion*: Smooth height-interpolated accordion with rotating plus/minus indicators and editorial typography.

### C. From `betteroff` (The Lookback)
9. **`surf-3d-ribbon`** — *Surf 3D Perspective Ribbon & Physics Engine*: Interactive 3D perspective card stream moving along a Z/Y/X curve driven by scroll/drag inertia with live active item HUD synchronization.
10. **`timeline-inertia-drag`** — *Horizontal Inertia Drag Timeline & Tick Ruler*: Physics-driven horizontal draggable timeline grouped by months with a synchronized tick ruler, snap clamping, and click audio feedback.
11. **`conveyor-scroll-loop`** — *Infinite Vertical Conveyor Scroll & Popover Loop*: Endless wrapping vertical scroll loop (`wrap()` math) with interactive hover/click popovers and editorial layout blocks.
12. **`audio-jukebox-player`** — *Vinyl/Visualizer Audio Jukebox & Sound Gate*: Floating multi-track audio synthesizer/player with Web Audio API procedural sound effects (click ticks, transitions, ambient synth loop), animated equalizer bars, and introductory Sound Gate modal.
13. **`article-slide-drawer`** — *Slide-Over Editorial Article Drawer*: Smooth backdrop-blurred slide-over reading drawer with rich typography, image gallery, and keyboard (`Esc`) / hash routing support.

### D. From `vivmgmt`
14. **`parallax-5col-gallery`** — *5-Column Alternating Parallax Artist Gallery*: Full-viewport 5-column masonry grid where odd and even columns scroll with opposing parallax velocities and smooth inertia.
15. **`split-screen-entrance`** — *Split-Screen Curtain Entrance & Viewport Reveal*: Choreographed split-screen loader and hero entrance that parts curtains to reveal the main stage.
16. **`fullscreen-parallax-footer`** — *Full-Screen Uncovering Parallax Footer*: Sticky bottom architectural footer that uncovers with parallax depth as the main content scrolls away.
17. **`news-3col-masonry`** — *Editorial 3-Column News & Press Feed*: High-fashion editorial masonry grid with hover image zoom, category badges, and date stamps.
18. **`artist-portfolio-lightbox`** — *Artist Portfolio Modal Lightbox*: High-resolution gallery modal with keyboard navigation, thumbnail strip, counter, and smooth zoom transitions.
19. **`responsive-burger-menu`** — *Full-Screen Choreographed Burger & Mobile Dropdown*: Animated morphing burger button with staggered full-screen navigation link reveals.

### E. From `21st.dev` Crafted UI & Modern Web Signatures
20. **`oklch-ambient-glow-hero`** — *21st.dev OKLCH Pulsing Aurora & Blur-In Hero*: The signature 21st.dev hero section with multi-layered `oklch()` radial gradient pulsing shaders, `lp-hero-in` blur-to-sharp text entrance, and interactive category chip river.
21. **`spotlight-bento-grid`** — *Mouse-Tracking Radial Spotlight Bento Grid*: Multi-card bento layout where a radial border and surface spotlight tracks cursor coordinates across neighboring cards simultaneously.
22. **`liquid-metal-shader-card`** — *WebGL / Canvas Liquid Metal & Noise Shader Surface*: Interactive iridescent liquid-metal shader background with pointer ripple distortion.
23. **`kinetic-typography-strapline`** — *Scroll-Driven Kinetic Editorial Strapline*: Scrubbed word-by-word opacity and blur reveal with mixed sans/serif italic emphasis (inspired by both `vivmgmt` Garamond strapline and `21st.dev` Averia italic accents).

### F. Complete Full-Website Templates & Live Admin CMS Studios
24. **`template-betteroff`** — *Full Website + Admin CMS: The Lookback (`betteroff`)*: Direct live preview & full multi-file access to `betteroff/index.html` and `betteroff/admin.html`.
25. **`template-carousel-play`** — *Full Website + Admin CMS: Gallery Play (`carousel-gallery-play`)*: Direct live preview & full multi-file access to `carousel-gallery-play/index.html` and `carousel-gallery-play/admin.html`.
26. **`template-vivmgmt`** — *Full Website + Admin CMS: Viv Management (`vivmgmt`)*: Direct live preview & full multi-file access to `vivmgmt/index.html` and `vivmgmt/admin.html`.

---

## 5. System Architecture & File Layout

```text
/home/edvins/features-for-web/web-for-options/
├── index.html                  # Main 21st.local Application (Grid View + IDE Workbench View)
├── styles.css                  # Design system (Dark/Light tokens, 21st.dev aesthetics, responsive split panes)
├── app.js                      # Application controller (Search, Filters, Live Iframes, Code Viewer, Zip/File Download, Local Feature Creator)
├── registry.js                 # Global window.FEATURE_REGISTRY + embedded source code strings so everything works even on file:// or static http://
├── registry.json               # Machine-readable catalog index for AI agents & external scripts
├── AGENT_GUIDE.md              # Explicit playbook for AI agents on how to extract a feature into a target project or add a new feature to this vault
├── scripts/
│   └── sync-registry.js        # Node utility script that scans features/*/ and regenerates registry.json & registry.js automatically
├── features/                   # 23+ isolated, 100% standalone plug-and-play feature folders
│   ├── works-wheel-3d/
│   │   ├── index.html          # Standalone runnable demo (HTML + linked or inline CSS/JS)
│   │   ├── style.css           # Scoped, dependency-free styles
│   │   ├── script.js           # Standalone vanilla JS implementation
│   │   └── component.tsx       # Original React/TSX component (for React projects)
│   ├── polaroid-string-carousel/
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── script.js
│   │   └── component.tsx
│   ├── cylindrical-3d-carousel/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   └── ... (all extracted standalone features)
└── tests/
    └── verify-registry.js      # Automated test suite verifying every feature folder, file, registry entry, and standalone HTML validity
```

### Key Technical Decisions (Builder Calls)
1. **Zero-Build Vanilla HTML/CSS/JS + Node Sync Script:** The main vault app (`index.html`, `styles.css`, `app.js`, `registry.js`) uses clean, modern Vanilla JS and CSS custom properties (matching the architecture of `betteroff`, `vivmgmt`, and `carousel-gallery-play`). It requires zero webpack/vite compilation to run, and works both over a local HTTP server (`python3 -m http.server` / `npx serve`) and directly.
2. **Pre-Bundled `registry.js` + `registry.json`:** By generating `registry.js` (which embeds the file tree and raw code strings of every `features/<slug>/*` file alongside `registry.json`), the code tabs (`Combined Single-File`, `HTML`, `CSS`, `JS`, `TSX`) and 1-click copy buttons work instantaneously with zero CORS issues, and `scripts/sync-registry.js` lets an agent rebuild the bundle in `<100ms` whenever a new folder is added to `features/`.
3. **Viewport-Aware Live Previews:** In the Catalog Grid, cards use an `IntersectionObserver` to mount/pause live iframe previews only when visible in the viewport—keeping 60fps performance even with 26+ heavy 3D/WebGL/physics animations on the page.
4. **In-App "Add Feature / Design" Modal:** In addition to agents adding folders to `features/` and running `node scripts/sync-registry.js`, the web UI includes a **"+ New Feature"** studio modal where you can paste HTML/CSS/JS, preview it live, save it immediately to the catalog, and download the generated `features/<slug>/` files.
