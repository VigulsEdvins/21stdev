# Graph Report - web-for-options  (2026-10-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 741 nodes · 777 edges · 88 communities (50 shown, 38 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `94355ab1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- verify-registry.js
- article-slide-drawer/meta.json
- 21st.dev Style Catalog Grid View
- artist-portfolio-lightbox/meta.json
- ref_react
- app.js
- audio-jukebox-player/meta.json
- polaroid-string-carousel/component.tsx
- cylindrical-3d-carousel/meta.json
- polaroid-string-carousel/script.js
- athletes-filter-showcase/meta.json
- cursor-image-trail/meta.json
- template-betteroff/meta.json
- template-carousel-play/meta.json
- template-cvmaker/meta.json
- template-mom/meta.json
- template-vivmgmt/meta.json
- a4-resume-previewer/meta.json
- before-after-resume-slider/meta.json
- editorial-3x3-hover-grid/meta.json
- job-keyword-matcher/meta.json
- kinetic-typography-strapline/meta.json
- liquid-metal-shader-card/meta.json
- multilingual-lang-switcher/meta.json
- news-3col-masonry/meta.json
- oklch-ambient-glow-hero/meta.json
- parallax-5col-gallery/meta.json
- portfolio-masonry-filter/meta.json
- responsive-burger-menu/meta.json
- split-screen-entrance/meta.json
- spotlight-bento-grid/meta.json
- star-verb-enhancer/meta.json
- studio-info-drawer/meta.json
- works-wheel-3d/component.tsx
- client-logo-marquee/meta.json
- custom-magnetic-cursor/meta.json
- faq-accordion-smooth/meta.json
- polaroid-string-carousel/meta.json
- surf-3d-ribbon/meta.json
- timeline-inertia-drag/meta.json
- works-wheel-3d/meta.json
- Feature Vault Design Specification
- Task 3: Extract carousel-gallery-play Features
- Polaroid String Carousel Root
- Chromatic Interference Fringes Shader
- works-wheel-3d/script.js
- timeline-inertia-drag/script.js
- Code Ownership Registry Model
- Custom Magnetic Cursor Standalone HTML Page
- Kinetic Strapline Stage
- Editorial Masonry Shell
- Responsive Navigation Shell
- studio-info-drawer/script.js
- surf-3d-ribbon/script.js
- analyzeText
- split-screen-entrance/script.js
- Bento Grid Layout
- Standard Feature Categories
- Dual Workspace UI Architecture
- analyzeBullet
- Registry Sync Protocol
- Task 6: Build 21st.local Web Application
- Task 2: Extract photo-caroulsel Features
- In-App Feature Studio Creator Modal
- Ambient Aurora Background Canvas
- Architecture Playback Mockup
- Layout Options Brainstorm Document
- Option A: 21st.dev Catalog Grid
- Option B: IDE Split-Screen Workbench

## God Nodes (most connected - your core abstractions)
1. `Feature Vault Design Specification` - 14 edges
2. `renderWorkbench()` - 10 edges
3. `openInspector()` - 8 edges
4. `renderCatalog()` - 8 edges
5. `PolaroidLineCarousel()` - 8 edges
6. `getAbsoluteFolderPath()` - 7 edges
7. `getItemName()` - 7 edges
8. `getAvailableTabs()` - 6 edges
9. `renderAll()` - 6 edges
10. `frame()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Task 1: Registry Sync Engine & Verification Suite` --conceptually_related_to--> `syncRegistry()`  [EXTRACTED]
  docs/superpowers/plans/2026-10-21-feature-vault-plan.md → scripts/sync-registry.js
- `Pre-Bundled registry.js In-Memory Code Store` --conceptually_related_to--> `syncRegistry()`  [EXTRACTED]
  docs/superpowers/specs/2026-10-21-feature-vault-design.md → scripts/sync-registry.js
- `Add Feature Agent Playbook` --references--> `verifyFeatureFolder()`  [INFERRED]
  AGENT_GUIDE.md → tests/verify-registry.js
- `Athletes Filterable Showcase Grid` --implements--> `Feature Vault Design Specification`  [INFERRED]
  features/athletes-filter-showcase/index.html → docs/superpowers/specs/2026-10-21-feature-vault-design.md
- `Full-Screen Architectural Parallax Footer` --implements--> `Feature Vault Design Specification`  [INFERRED]
  features/fullscreen-parallax-footer/index.html → docs/superpowers/specs/2026-10-21-feature-vault-design.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Betteroff Lookback Extracted Features** — features_conveyor_scroll_loop_index_infinite_conveyor_stage, features_audio_jukebox_player_index_sound_gate_intro, features_article_slide_drawer_index_editorial_drawer_panel [EXTRACTED 1.00]
- **Carousel Gallery Play Extracted Features** — features_cylindrical_3d_carousel_index_cylindrical_3d_viewport, features_cursor_image_trail_index_velocity_trail_canvas, features_client_logo_marquee_index_dual_direction_marquee, features_athletes_filter_showcase_index_athletes_rail_grid, features_custom_magnetic_cursor_index_magnetic_cursor_ring, features_faq_accordion_smooth_index_smooth_faq_container [EXTRACTED 1.00]
- **Feature Vault Architecture & Governance** — agent_guide_feature_vault_integration_workflow, agent_guide_add_feature_agent_playbook, docs_superpowers_specs_2026_10_21_feature_vault_design_code_ownership_registry, docs_superpowers_plans_2026_10_21_feature_vault_plan_dual_workspace_architecture [EXTRACTED 1.00]
- **Full Website and CMS Templates** — features_template_betteroff_index_betteroff_suite, features_template_carousel_play_index_play_agency_suite, features_template_vivmgmt_index_vivmgmt_suite [EXTRACTED 1.00]
- **Personal Vault Dual-Workspace Layout** — index_vault_header, index_catalog_view, index_workbench_view, index_inspector_modal [EXTRACTED 1.00]
- **Physics and 3D Motion Interactions** — features_surf_3d_ribbon_index_sine_wave_stream, features_works_wheel_3d_index_ring_to_drum_morph, features_polaroid_string_carousel_index_breeze_physics, features_timeline_inertia_drag_index_inertia_drag_mechanics [INFERRED 0.85]

## Communities (88 total, 38 thin omitted)

### Community 0 - "verify-registry.js"
Cohesion: 0.06
Nodes (33): Add Feature Agent Playbook, Single-File HTML Inlining Engine, Task 1: Registry Sync Engine & Verification Suite, Pre-Bundled registry.js In-Memory Code Store, fs, http, MIME_TYPES, PARENT_ROOT (+25 more)

### Community 1 - "article-slide-drawer/meta.json"
Cohesion: 0.06
Nodes (26): Task 4: Extract betteroff Features, Article Slide Drawer Standalone HTML Page, Story Grid Demo Stage, category, dependencies, description, order, slug (+18 more)

### Community 2 - "21st.dev Style Catalog Grid View"
Cohesion: 0.06
Nodes (33): Multi-Column Staggered Parallax Motion, 5-Column Parallax Gallery, Horizontal Pan & Scroll Stage, Lower Monogram Curtain Half, Split-Screen Curtain Stage, Upper Monogram Curtain Half, Bipartite Monogram Split Entrance Choreography, Revealed Underlay Hero (+25 more)

### Community 3 - "artist-portfolio-lightbox/meta.json"
Cohesion: 0.06
Nodes (25): Task 5: Extract vivmgmt Features and Templates, Artist Portfolio Lightbox Standalone HTML Page, Artist Selected Works Plate Grid, category, dependencies, description, name, order (+17 more)

### Community 4 - "ref_react"
Cohesion: 0.07
Nodes (11): CELLS, GridCell, DICTIONARY, DICTIONARY, Locale, Translations, Category, Project (+3 more)

### Community 5 - "app.js"
Cohesion: 0.21
Nodes (21): buildCustomFeatureFromForm(), combineRuntimeHtml(), copyText(), downloadHtmlFile(), getAbsoluteFolderPath(), getAgentReference(), getAvailableTabs(), getFilteredFeatures() (+13 more)

### Community 6 - "audio-jukebox-player/meta.json"
Cohesion: 0.13
Nodes (18): Floating Audio Pill Player & Equalizer, Audio Jukebox Player Standalone HTML Page, Sound Gate Audio Experience Intro Modal, category, dependencies, description, order, slug (+10 more)

### Community 7 - "polaroid-string-carousel/component.tsx"
Cohesion: 0.18
Nodes (18): clamp(), DEFAULT_SLIDES, hexRgb(), LandPalette, mixRgb(), mulberry32(), nearestAt(), pad2() (+10 more)

### Community 8 - "cylindrical-3d-carousel/meta.json"
Cohesion: 0.12
Nodes (11): 3D Cylindrical Perspective Carousel Viewport, Cylindrical 3D Carousel Standalone HTML Page, category, dependencies, description, order, slug, source (+3 more)

### Community 9 - "polaroid-string-carousel/script.js"
Cohesion: 0.26
Nodes (14): clamp(), endDrag(), frame(), goTo(), hexRgb(), mixRgb(), mulberry32(), nearestAt() (+6 more)

### Community 10 - "athletes-filter-showcase/meta.json"
Cohesion: 0.13
Nodes (12): Athletes Filterable Showcase Grid, Athletes Filter Showcase Standalone HTML Page, Talent Category Tablist, category, dependencies, description, order, slug (+4 more)

### Community 11 - "cursor-image-trail/meta.json"
Cohesion: 0.14
Nodes (10): Cursor Image Trail Standalone HTML Page, category, dependencies, description, order, slug, source, tags (+2 more)

### Community 12 - "template-betteroff/meta.json"
Cohesion: 0.14
Nodes (13): adminUrl, category, dependencies, description, liveSiteUrl, name, order, slug (+5 more)

### Community 13 - "template-carousel-play/meta.json"
Cohesion: 0.14
Nodes (13): adminUrl, category, dependencies, description, liveSiteUrl, name, order, slug (+5 more)

### Community 14 - "template-cvmaker/meta.json"
Cohesion: 0.14
Nodes (13): adminUrl, category, dependencies, description, liveSiteUrl, name, order, slug (+5 more)

### Community 15 - "template-mom/meta.json"
Cohesion: 0.14
Nodes (13): adminUrl, category, dependencies, description, liveSiteUrl, name, order, slug (+5 more)

### Community 16 - "template-vivmgmt/meta.json"
Cohesion: 0.14
Nodes (13): adminUrl, category, dependencies, description, liveSiteUrl, name, order, slug (+5 more)

### Community 17 - "a4-resume-previewer/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 18 - "before-after-resume-slider/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 19 - "editorial-3x3-hover-grid/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 20 - "job-keyword-matcher/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 21 - "kinetic-typography-strapline/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 22 - "liquid-metal-shader-card/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 23 - "multilingual-lang-switcher/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 24 - "news-3col-masonry/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 25 - "oklch-ambient-glow-hero/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 26 - "parallax-5col-gallery/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 27 - "portfolio-masonry-filter/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 28 - "responsive-burger-menu/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 29 - "split-screen-entrance/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 30 - "spotlight-bento-grid/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 31 - "star-verb-enhancer/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 32 - "studio-info-drawer/meta.json"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 33 - "works-wheel-3d/component.tsx"
Cohesion: 0.27
Nodes (9): bowAt(), clamp(), lerp(), place(), rad(), Stage, WorksWheel(), WorksWheelItem (+1 more)

### Community 34 - "client-logo-marquee/meta.json"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 35 - "custom-magnetic-cursor/meta.json"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 36 - "faq-accordion-smooth/meta.json"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 37 - "polaroid-string-carousel/meta.json"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 38 - "surf-3d-ribbon/meta.json"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 39 - "timeline-inertia-drag/meta.json"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 40 - "works-wheel-3d/meta.json"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 41 - "Feature Vault Design Specification"
Cohesion: 0.28
Nodes (7): 21st.local Agent & Developer Feature Vault Guide, Feature Vault Implementation Plan, Feature Vault Design Specification, Slide-Over Editorial Reader Drawer Panel, Artist Monograph Lightbox Modal, Velocity-Driven Cursor Image Trail Canvas, Custom Dual-Ring Follower Cursor

### Community 42 - "Task 3: Extract carousel-gallery-play Features"
Cohesion: 0.25
Nodes (5): Task 3: Extract carousel-gallery-play Features, Dual-Direction Infinite Partner Marquee, Client Logo Marquee Standalone HTML Page, FAQ Accordion Smooth Standalone HTML Page, Smooth-Height Editorial FAQ Accordion

### Community 43 - "Polaroid String Carousel Root"
Cohesion: 0.29
Nodes (8): Breeze Physics and Sagging String Simulation, Polaroid Hanging Cards Container, Polaroid String Carousel Root, Sagging SVG String Catenary Path, Horizontal Inertia Drag and Vernier Scale Physics, Mechanical Tick Ruler and Months Scale, Timeline Drag Viewport Track, Horizontal Inertia Drag Timeline Root

### Community 44 - "Chromatic Interference Fringes Shader"
Cohesion: 0.29
Nodes (7): Chromatic Interference Fringes Shader, Liquid Chrome Metal Canvas, Liquid Metal Shader Stage, OKLCH Ambient Aurora Hero Section, Aurora Ambient Light Orbs, Wide-Gamut OKLCH Color Engine, OKLCH Palette Preset Chips

### Community 46 - "timeline-inertia-drag/script.js"
Cohesion: 0.50
Nodes (3): checkActiveMonth(), startAnimation(), step()

### Community 49 - "Kinetic Strapline Stage"
Cohesion: 0.50
Nodes (4): Kinetic Manifesto Typography Scrub, Scrub Progress Readout, Kinetic Strapline Stage, Word Scrubber Slider Control

### Community 50 - "Editorial Masonry Shell"
Cohesion: 0.67
Nodes (4): Editorial Chronicle Taxonomy, Masonry Tag Filter Bar, 3-Column Masonry Grid Container, Editorial Masonry Shell

### Community 51 - "Responsive Navigation Shell"
Cohesion: 0.67
Nodes (4): Morphing Burger Button, Morphing Icon & Staggered Reveal Pattern, Responsive Navigation Shell, Staggered Curtain Overlay Menu

### Community 57 - "Bento Grid Layout"
Cohesion: 0.67
Nodes (3): Bento Grid Layout, Spotlight Bento Grid Stage, Cursor-Tracked Specular Spotlight Effect

## Knowledge Gaps
- **50 isolated node(s):** `Horizontal Pan & Scroll Stage`, `Lower Monogram Curtain Half`, `Upper Monogram Curtain Half`, `Revealed Underlay Hero`, `BetterOff Launch and Admin Actions` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 521 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Feature Vault Design Specification` connect `Feature Vault Design Specification` to `article-slide-drawer/meta.json`, `artist-portfolio-lightbox/meta.json`, `audio-jukebox-player/meta.json`, `cylindrical-3d-carousel/meta.json`, `athletes-filter-showcase/meta.json`, `Task 3: Extract carousel-gallery-play Features`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `Feature Vault Design Specification` (e.g. with `21st.local Agent & Developer Feature Vault Guide` and `Slide-Over Editorial Reader Drawer Panel`) actually correct?**
  _`Feature Vault Design Specification` has 13 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Horizontal Pan & Scroll Stage`, `Lower Monogram Curtain Half`, `Upper Monogram Curtain Half` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `verify-registry.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05975609756097561 - nodes in this community are weakly interconnected._
- **Why does `Audio Jukebox Player Standalone HTML Page` connect `audio-jukebox-player/meta.json` to `article-slide-drawer/meta.json`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Should `article-slide-drawer/meta.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Why does `Task 3: Extract carousel-gallery-play Features` connect `Task 3: Extract carousel-gallery-play Features` to `Custom Magnetic Cursor Standalone HTML Page`, `cylindrical-3d-carousel/meta.json`, `athletes-filter-showcase/meta.json`, `cursor-image-trail/meta.json`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._