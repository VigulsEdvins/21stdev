# Graph Report - web-for-options  (2026-10-21)

## Corpus Check
- 91 files · ~70,727 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .css 27, (none) 3)

## Summary
- 560 nodes · 596 edges · 63 communities (36 shown, 27 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Parallax & Curtain Choreography
- BetterOff Lookback Features
- Vivienne Mgmt Editorial Blocks
- PLAY 3D Cylinder & Marquee
- Registry Sync & Test Suite
- Vault Architecture & Specs
- 21st.local Application Engine
- Web Audio Jukebox & Equalizer
- Polaroid String Carousel (TSX)
- Polaroid String Carousel (Vanilla)
- Athletes Roster Filter Grid
- Cursor Velocity Image Trail
- Magnetic Cursor & Reticle
- BetterOff Full CMS Template
- PLAY Agency Full CMS Template
- Vivienne Mgmt Full CMS Template
- Works 3D Wheel (TSX)
- Kinetic Strapline Metadata
- Liquid Metal Shader Metadata
- Editorial Masonry Metadata
- OKLCH Aurora Hero Metadata
- 5-Column Parallax Metadata
- Morphing Burger Metadata
- Split-Screen Entrance Metadata
- Spotlight Bento Grid Metadata
- Polaroid Carousel Metadata
- 3D Surf Ribbon Metadata
- Inertia Timeline Metadata
- 3D Works Wheel Metadata
- String & Vernier Physics
- OKLCH & Liquid Chrome Shaders
- Works 3D Wheel (Vanilla)
- Timeline Inertia Physics
- Zero-Dependency Ownership Model
- Kinetic Typography Scrubber
- 3-Column Masonry Filter
- Morphing Burger Navigation
- 3D Surf Ribbon Engine
- Split-Screen Curtain Engine
- Cursor Spotlight Bento Grid
- Source & Category Taxonomy
- Dual Workspace & Inspector UI
- Registry Sync Protocol
- Main Application Build Task
- Photo-Carousel Extraction Task
- In-App Feature Studio Modal
- Ambient Aurora Backdrop
- Architecture Playback Mockup
- Layout Options Mockup
- Catalog Grid Mode
- IDE Workbench Mode

## God Nodes (most connected - your core abstractions)
1. `Feature Vault Design Specification` - 14 edges
2. `PolaroidLineCarousel()` - 8 edges
3. `renderWorkbench()` - 7 edges
4. `getAbsoluteFolderPath()` - 6 edges
5. `renderCatalog()` - 6 edges
6. `renderAll()` - 6 edges
7. `frame()` - 6 edges
8. `Task 3: Extract carousel-gallery-play Features` - 6 edges
9. `21st.dev Style Catalog Grid View` - 6 edges
10. `renderInspectorCodeTabs()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Task 1: Registry Sync Engine & Verification Suite` --conceptually_related_to--> `syncRegistry()`  [EXTRACTED]
  docs/superpowers/plans/2026-10-21-feature-vault-plan.md → scripts/sync-registry.js
- `Pre-Bundled registry.js In-Memory Code Store` --conceptually_related_to--> `syncRegistry()`  [EXTRACTED]
  docs/superpowers/specs/2026-10-21-feature-vault-design.md → scripts/sync-registry.js
- `Add Feature Agent Playbook` --references--> `verifyFeatureFolder()`  [INFERRED]
  AGENT_GUIDE.md → tests/verify-registry.js
- `Athletes Filterable Showcase Grid` --implements--> `Feature Vault Design Specification`  [INFERRED]
  features/athletes-filter-showcase/index.html → docs/superpowers/specs/2026-10-21-feature-vault-design.md
- `Sound Gate Audio Experience Intro Modal` --implements--> `Feature Vault Design Specification`  [INFERRED]
  features/audio-jukebox-player/index.html → docs/superpowers/specs/2026-10-21-feature-vault-design.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Carousel Gallery Play Extracted Features** — features_cylindrical_3d_carousel_index_cylindrical_3d_viewport, features_cursor_image_trail_index_velocity_trail_canvas, features_client_logo_marquee_index_dual_direction_marquee, features_athletes_filter_showcase_index_athletes_rail_grid, features_custom_magnetic_cursor_index_magnetic_cursor_ring, features_faq_accordion_smooth_index_smooth_faq_container [EXTRACTED 1.00]
- **Betteroff Lookback Extracted Features** — features_conveyor_scroll_loop_index_infinite_conveyor_stage, features_audio_jukebox_player_index_sound_gate_intro, features_article_slide_drawer_index_editorial_drawer_panel [EXTRACTED 1.00]
- **Feature Vault Architecture & Governance** — agent_guide_feature_vault_integration_workflow, agent_guide_add_feature_agent_playbook, docs_superpowers_specs_2026_10_21_feature_vault_design_code_ownership_registry, docs_superpowers_plans_2026_10_21_feature_vault_plan_dual_workspace_architecture [EXTRACTED 1.00]
- **Full Website and CMS Templates** — features_template_betteroff_index_betteroff_suite, features_template_carousel_play_index_play_agency_suite, features_template_vivmgmt_index_vivmgmt_suite [EXTRACTED 1.00]
- **Physics and 3D Motion Interactions** — features_surf_3d_ribbon_index_sine_wave_stream, features_works_wheel_3d_index_ring_to_drum_morph, features_polaroid_string_carousel_index_breeze_physics, features_timeline_inertia_drag_index_inertia_drag_mechanics [INFERRED 0.85]
- **Personal Vault Dual-Workspace Layout** — index_vault_header, index_catalog_view, index_workbench_view, index_inspector_modal [EXTRACTED 1.00]

## Communities (63 total, 27 thin omitted)

### Community 0 - "Parallax & Curtain Choreography"
Cohesion: 0.06
Nodes (33): Multi-Column Staggered Parallax Motion, 5-Column Parallax Gallery, Horizontal Pan & Scroll Stage, Lower Monogram Curtain Half, Split-Screen Curtain Stage, Upper Monogram Curtain Half, Bipartite Monogram Split Entrance Choreography, Revealed Underlay Hero (+25 more)

### Community 1 - "BetterOff Lookback Features"
Cohesion: 0.06
Nodes (25): Task 4: Extract betteroff Features, Article Slide Drawer Standalone HTML Page, Story Grid Demo Stage, category, dependencies, description, order, slug (+17 more)

### Community 2 - "Vivienne Mgmt Editorial Blocks"
Cohesion: 0.06
Nodes (25): Task 5: Extract vivmgmt Features and Templates, Artist Portfolio Lightbox Standalone HTML Page, Artist Selected Works Plate Grid, category, dependencies, description, name, order (+17 more)

### Community 3 - "PLAY 3D Cylinder & Marquee"
Cohesion: 0.07
Nodes (22): Task 3: Extract carousel-gallery-play Features, Cylindrical 3D Carousel Standalone HTML Page, category, dependencies, description, order, slug, source (+14 more)

### Community 4 - "Registry Sync & Test Suite"
Cohesion: 0.09
Nodes (22): Add Feature Agent Playbook, Single-File HTML Inlining Engine, Task 1: Registry Sync Engine & Verification Suite, Pre-Bundled registry.js In-Memory Code Store, combineFeatureHtml(), fs, path, syncRegistry() (+14 more)

### Community 5 - "Vault Architecture & Specs"
Cohesion: 0.09
Nodes (20): 21st.local Agent & Developer Feature Vault Guide, Feature Vault Implementation Plan, Feature Vault Design Specification, Slide-Over Editorial Reader Drawer Panel, Artist Monograph Lightbox Modal, Dual-Direction Infinite Partner Marquee, Client Logo Marquee Standalone HTML Page, category (+12 more)

### Community 6 - "21st.local Application Engine"
Cohesion: 0.21
Nodes (17): buildCustomFeatureFromForm(), combineRuntimeHtml(), copyText(), downloadHtmlFile(), getAbsoluteFolderPath(), getAgentReference(), getAvailableTabs(), getFilteredFeatures() (+9 more)

### Community 7 - "Web Audio Jukebox & Equalizer"
Cohesion: 0.13
Nodes (18): Floating Audio Pill Player & Equalizer, Audio Jukebox Player Standalone HTML Page, Sound Gate Audio Experience Intro Modal, category, dependencies, description, order, slug (+10 more)

### Community 8 - "Polaroid String Carousel (TSX)"
Cohesion: 0.18
Nodes (18): clamp(), DEFAULT_SLIDES, hexRgb(), LandPalette, mixRgb(), mulberry32(), nearestAt(), pad2() (+10 more)

### Community 9 - "Polaroid String Carousel (Vanilla)"
Cohesion: 0.26
Nodes (14): clamp(), endDrag(), frame(), goTo(), hexRgb(), mixRgb(), mulberry32(), nearestAt() (+6 more)

### Community 10 - "Athletes Roster Filter Grid"
Cohesion: 0.13
Nodes (12): Athletes Filterable Showcase Grid, Athletes Filter Showcase Standalone HTML Page, Talent Category Tablist, category, dependencies, description, order, slug (+4 more)

### Community 11 - "Cursor Velocity Image Trail"
Cohesion: 0.14
Nodes (10): Cursor Image Trail Standalone HTML Page, category, dependencies, description, order, slug, source, tags (+2 more)

### Community 12 - "Magnetic Cursor & Reticle"
Cohesion: 0.14
Nodes (11): Magnetic Zones and Action Buttons Stage, Custom Magnetic Cursor Standalone HTML Page, category, dependencies, description, order, slug, source (+3 more)

### Community 13 - "BetterOff Full CMS Template"
Cohesion: 0.14
Nodes (13): adminUrl, category, dependencies, description, liveSiteUrl, name, order, slug (+5 more)

### Community 14 - "PLAY Agency Full CMS Template"
Cohesion: 0.14
Nodes (13): adminUrl, category, dependencies, description, liveSiteUrl, name, order, slug (+5 more)

### Community 15 - "Vivienne Mgmt Full CMS Template"
Cohesion: 0.14
Nodes (13): adminUrl, category, dependencies, description, liveSiteUrl, name, order, slug (+5 more)

### Community 16 - "Works 3D Wheel (TSX)"
Cohesion: 0.24
Nodes (9): bowAt(), clamp(), lerp(), place(), rad(), Stage, WorksWheel(), WorksWheelItem (+1 more)

### Community 17 - "Kinetic Strapline Metadata"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 18 - "Liquid Metal Shader Metadata"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 19 - "Editorial Masonry Metadata"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 20 - "OKLCH Aurora Hero Metadata"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 21 - "5-Column Parallax Metadata"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 22 - "Morphing Burger Metadata"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 23 - "Split-Screen Entrance Metadata"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 24 - "Spotlight Bento Grid Metadata"
Cohesion: 0.18
Nodes (10): category, dependencies, description, name, order, slug, source, tags (+2 more)

### Community 25 - "Polaroid Carousel Metadata"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 26 - "3D Surf Ribbon Metadata"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 27 - "Inertia Timeline Metadata"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 28 - "3D Works Wheel Metadata"
Cohesion: 0.20
Nodes (9): category, dependencies, description, order, slug, source, tags, title (+1 more)

### Community 29 - "String & Vernier Physics"
Cohesion: 0.29
Nodes (8): Breeze Physics and Sagging String Simulation, Polaroid Hanging Cards Container, Polaroid String Carousel Root, Sagging SVG String Catenary Path, Horizontal Inertia Drag and Vernier Scale Physics, Mechanical Tick Ruler and Months Scale, Timeline Drag Viewport Track, Horizontal Inertia Drag Timeline Root

### Community 30 - "OKLCH & Liquid Chrome Shaders"
Cohesion: 0.29
Nodes (7): Chromatic Interference Fringes Shader, Liquid Chrome Metal Canvas, Liquid Metal Shader Stage, OKLCH Ambient Aurora Hero Section, Aurora Ambient Light Orbs, Wide-Gamut OKLCH Color Engine, OKLCH Palette Preset Chips

### Community 32 - "Timeline Inertia Physics"
Cohesion: 0.50
Nodes (3): checkActiveMonth(), startAnimation(), step()

### Community 34 - "Kinetic Typography Scrubber"
Cohesion: 0.50
Nodes (4): Kinetic Manifesto Typography Scrub, Scrub Progress Readout, Kinetic Strapline Stage, Word Scrubber Slider Control

### Community 35 - "3-Column Masonry Filter"
Cohesion: 0.67
Nodes (4): Editorial Chronicle Taxonomy, Masonry Tag Filter Bar, 3-Column Masonry Grid Container, Editorial Masonry Shell

### Community 36 - "Morphing Burger Navigation"
Cohesion: 0.67
Nodes (4): Morphing Burger Button, Morphing Icon & Staggered Reveal Pattern, Responsive Navigation Shell, Staggered Curtain Overlay Menu

### Community 39 - "Cursor Spotlight Bento Grid"
Cohesion: 0.67
Nodes (3): Bento Grid Layout, Spotlight Bento Grid Stage, Cursor-Tracked Specular Spotlight Effect

## Knowledge Gaps
- **50 isolated node(s):** `Architecture Playback Mockup`, `Self-Contained Feature Architecture Concept`, `On-Disk Feature Folder Structure`, `Inspector Modal Live Preview and Code Exporter`, `Layout Options Brainstorm Document` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 373 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Feature Vault Design Specification` connect `Vault Architecture & Specs` to `Vivienne Mgmt Editorial Blocks`, `Athletes Roster Filter Grid`, `PLAY 3D Cylinder & Marquee`, `Web Audio Jukebox & Equalizer`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `Feature Vault Design Specification` (e.g. with `21st.local Agent & Developer Feature Vault Guide` and `Slide-Over Editorial Reader Drawer Panel`) actually correct?**
  _`Feature Vault Design Specification` has 13 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Architecture Playback Mockup`, `Self-Contained Feature Architecture Concept`, `On-Disk Feature Folder Structure` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Parallax & Curtain Choreography` be split into smaller, more focused modules?**
  _Cohesion score 0.06439393939393939 - nodes in this community are weakly interconnected._
- **Why does `Audio Jukebox Player Standalone HTML Page` connect `Web Audio Jukebox & Equalizer` to `BetterOff Lookback Features`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `BetterOff Lookback Features` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Why does `Task 3: Extract carousel-gallery-play Features` connect `PLAY 3D Cylinder & Marquee` to `Athletes Roster Filter Grid`, `Cursor Velocity Image Trail`, `Magnetic Cursor & Reticle`, `Vault Architecture & Specs`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._