# 21st.local — Agent & Developer Feature Vault Guide

This directory (`/home/edvins/features-for-web/web-for-options`) is a self-contained **Feature, Component & Design Registry** modeled after **21st.dev**. Every item is pre-extracted into clean, standalone, 100% functional code so humans and AI coding agents can immediately copy or integrate any feature into a target project—or add new features to this vault.

---

## 1. How to Use a Feature from This Vault in Another Project

1. **Discover Available Features:**
   Read [`registry.json`](file:///home/edvins/features-for-web/web-for-options/registry.json) to search by `slug`, `category`, `source`, or `tags`.
2. **Read the Standalone Feature Files:**
   Every feature lives in `/home/edvins/features-for-web/web-for-options/features/<slug>/`:
   - `meta.json` — Title, category, tags, dependencies, and source details.
   - `index.html` — Complete, runnable standalone markup for the feature.
   - `style.css` — Scoped CSS for the feature (zero external stylesheet bloat).
   - `script.js` — Clean, self-contained JavaScript / physics / animation controller.
   - `component.tsx` *(optional)* — Original React / TypeScript component when applicable.
3. **Integrate into the Target Project:**
   - For **Vanilla HTML/CSS/JS** projects: Copy the markup from `features/<slug>/index.html`, styles from `style.css`, and logic from `script.js`.
   - For **React / Next.js / Vite** projects: If `component.tsx` exists, copy it directly; otherwise port the clean DOM structure and `script.js` `requestAnimationFrame`/event lifecycle into a `useEffect` hook with scoped styles.

---

## 2. How to Add a New Feature or Design to This Vault (Via Agent)

Whenever the user asks you to *"add this feature/design to `web-for-options`"* (or extract a feature from a website/folder into this vault):

1. **Create a New Folder:**
   Create `/home/edvins/features-for-web/web-for-options/features/<your-feature-slug>/`.
2. **Create the 4 Required Files inside `features/<your-feature-slug>/`:**
   - **`meta.json`**:
     ```json
     {
       "slug": "your-feature-slug",
       "title": "Human Readable Title",
       "category": "3D & Carousels",
       "source": "custom",
       "type": "component",
       "description": "Concise description of the visual effect, physics, and interaction.",
       "tags": ["3d", "carousel", "physics", "interactive"],
       "dependencies": ["Vanilla HTML/CSS/JS"],
       "order": 30
     }
     ```
     *(Standard categories: `"3D & Carousels"`, `"Scroll & Parallax"`, `"Cursors & Physics"`, `"Galleries & Grids"`, `"Navigation & UI"`, `"Audio & Shaders"`, `"Full Templates"`)*
   - **`index.html`**: Must be a 100% working standalone HTML5 page linking `<link rel="stylesheet" href="style.css">` and `<script src="script.js"></script>`, with zero broken external image links.
   - **`style.css`**: Self-contained CSS rules.
   - **`script.js`**: Self-contained JavaScript.
   - **`component.tsx`** *(optional)*: React TypeScript version if applicable.
3. **Sync the Registry:**
   Run the sync command from `/home/edvins/features-for-web/web-for-options`:
   ```bash
   node scripts/sync-registry.js
   ```
   This automatically updates `registry.json` and `registry.js` (`window.FEATURE_REGISTRY`) so the new feature appears immediately in both the **21st.local Catalog Grid** and **IDE Workbench**.
4. **Verify Everything Passes:**
   ```bash
   node tests/verify-registry.js
   ```
