# Header links: every menu item goes somewhere real, or is not shown

Status: **approved 2026-10-29 (mega menu to draft, unlinked items hidden in the export, footers a later follow-up). All 5 steps built.** Covers options 2, 1, 3 and 5 from the discussion of 2026-10-29. Option 4 (more than one page) turned out to be mostly built already: see "What already exists".

## Why

A client who picks a header such as the mega menu gets a menu that looks like a multi-page product site ("Editor", "Hosting", "Domains", "Release notes"). Clicking any of it does nothing. I checked the 10 header blocks:

| Header | Links | Where they point today | Editable in the admin panel |
|---|---|---|---|
| responsive-burger-menu | 4 | `#` (nothing) | 3 menu links |
| multilingual-lang-switcher | 4 | `#` | none |
| dither-sweep-navbar | 5 | `#` | none |
| frosted-glass-menu | 10 | `#` | 2 (one menu link, the button) |
| bottom-tab-bar | 0 | (buttons) | none |
| centered-logo-header | 9 | `#shop`, `#journal`, `#about`... | none |
| mega-menu-header | 12 | `#editor`, `#hosting`, `#release`... | the button only |
| search-first-header | 8 | `#women`, `#sale`, `#cart`... | none |
| split-nav-announcement | 8 | `#sale`, `#shop`... | none |
| sticky-shrink-header | 6 | `#product`, `#pricing`... | the button only |

Two separate problems:

1. **Nothing to click.** `#` goes nowhere, and `#pricing` goes nowhere because no section on the exported page has the id `pricing` (sections get random ids like `sec-ab12cd`).
2. **Nothing to edit.** Most menu items cannot be changed in the admin panel, so a client cannot fix it even if they know how.

The page check does not warn about this either: `link-empty` only catches `#`, and `cta-no-link` only looks at links marked `data-edv-cta` (the pricing buttons).

## What already exists (and changes the picture)

- **Multi-page sites are built.** `page-tabs.js` adds, renames and deletes pages and copies the header and footer to all pages. The exports (ZIP and single file) already resolve links written as `page:<id>` (`mapPageLinks` in `assembler.js`, `safeUrl` in `scripts/cms/admin.js`).
- **But there is no way to pick a page.** The admin panel's link field is a plain text box ("https://… or page.html or #section"). A client would have to type `page:abc123` by hand. So multi-page headers are possible but not usable.
- The pricing blocks already show the pattern for this work: link fields in `meta.json`, a marker attribute (`data-edv-cta`), a warning in `page-checks.js`, and an e2e test (`tests/e2e/pricing-links.e2e.js`).

So the problem is mostly missing glue, not a missing feature, and option 4 shrinks to "make the existing pages linkable".

## What will change (and why)

### Step 1. Sections get stable anchor names (option 1)

- Each section on the page gets an anchor name, by default made from its title or block name ("Pricing" gives `pricing`; duplicates become `pricing-2`). It is stored with the section and can be renamed.
- In the export, the anchor is emitted as an empty `<a id="pricing" class="edv-anchor"></a>` placed just before the section, with `scroll-margin-top` so a sticky header does not cover the title. *Why a separate element:* the section already uses its `id` (`sec-…`) for the builder, checks and the multi-page router; changing that id would break them.
- The anchors are also in the single-file export (in a multi-page single file the router shows the right page before scrolling, and page keys are never used as anchor names). The live preview has none: preview-patch swaps sections in place, and the picker in step 2 does not need them.
- Built 2026-10-29: `scripts/builder/anchors.js`, `tests/test-anchors.js`. The field to rename an anchor and the hand-over of the section and page list to the admin panel moved to step 2, where they are first used.
- *Why:* without real targets, no link field can be correct.

### Step 2. A link picker in the admin panel (option 2)

- The link field keeps its text box (web address, `mailto:`, `tel:`) and gets a **"Go to…"** choice next to it with three groups: *A section on this page* (the anchors from step 1, by name), *Another page of this site* (writes `page:<id>`, only shown when the site has 2+ pages), *A web address / email / phone* (the text box).
- The admin panel gets the list of sections and pages through its existing data hand-over (`cms-export.js` already passes `forms`; `targets` is added next to it).
- Picking a section or page is the easy path for a non-technical client; nobody has to type `#` or `page:`.
- *Why:* this is the one field that all the header changes depend on, and it also makes the pricing buttons and any other link better.

### Step 3. Every nav item in the 10 headers is editable and pre-filled (options 2 and 1)

- In each header's `meta.json`, add `customizable` entries for **every** menu item: its text and its link (`bottom-tab-bar` has none to add, only buttons: its tabs are included). Dropdown children too.
- Items link themselves by name (built differently from first written): at export, an item still at `#` whose text names a section (Pricing, About, Customers, Say hello...) gets that section's address. No match leaves it unlinked for step 5. A link set in the admin panel always wins. Demo items stay `href="#"`, not empty (an empty href reloads the preview). Skipped: the mega menu (draft in step 4) and the bottom tab bar (tabs, not links).
- The demo `href`s in the markup become empty, except the logo (`#top`, which always works).
- *Why:* editing is useless if only 1 of 12 links can be edited.

### Step 4. Headers that only make sense on a many-page site (option 3)

- `mega-menu-header` is moved to `status: "draft"`. The builder hides drafts unless "Drafts" is ticked, and sites that already use it keep working (the stack stores the slug). It has 12 links in two dropdown panels and promises pages a landing site does not have.
- Decision for the owner: instead of draft, show it **only when the site has 2 or more pages**, once step 2 makes pages linkable. That is better for clients but needs a small rule in the block picker. Default if no answer: draft now, revisit.
- `search-first-header` and `split-nav-announcement` have shop-style links (cart, account, women, men, sale). They are kept, but get the same treatment as step 3, and their descriptions say they are for shops.
- *Why:* better to offer fewer headers that work than many that look like a product site.

### Step 5. Unlinked items are hidden in the export, and flagged in the builder (option 5)

- Menu items in the 10 headers carry `data-edv-nav` (like `data-edv-cta` on pricing buttons). In the **export only**, an item whose link is empty, `#`, or an anchor that does not exist on the page is removed, with its list item. A dropdown whose children are all removed loses its trigger button too. The builder preview keeps showing them (greyed out with a note), so the client sees what to fix.
- `page-checks.js` gets a new warning, `nav-no-link`: "N menu items have no link and will not appear on your site. Open the admin panel (Content tab) and choose where each should go." It also catches `#something` where nothing on the page has that id.
- If **all** items are removed, the header is still exported (logo and button), never an empty bar.
- *Why:* a missing menu item is better than a dead one, and the warning means it never happens silently.

## What this does not do

- It does not add new pages or a page builder: that exists already in the page tabs.
- It does not add links to the footer blocks (`cta-footer` has the same dead `#about`, `#careers`, `#press` links). It is the same fix and a good follow-up once this works, but it is a separate change.
- It does not guess where a client wants a link to go. Items without a destination are hidden, not invented.

## Tests

- Unit: anchor naming (duplicates, accents, empty titles), the `nav-no-link` check, hiding items in the export (including a dropdown that ends up empty, and a header with every item removed).
- E2E (new `header-links.e2e.js`, in the style of `pricing-links.e2e.js`): add a header and a pricing section; the item "Pricing" is pre-filled with `#pricing`; export; the link scrolls to the right section; unlinked items are warned about and missing from the export; a multi-page site can pick another page and the exported link works in ZIP and single-file form.
- Existing checks to keep green: `npm test`, `check-fields` (every new `customizable` selector must match something), `check-exports`, `check-blank`, and the visual baseline for the 10 headers (hidden items change their look; re-baseline deliberately).

## Order of work

1. Anchors (step 1) and the `targets` hand-over: small, no visible change.
2. Link picker (step 2): usable on its own, improves all links.
3. Header link fields and pre-fill (step 3), one header at a time, `check-fields` after each.
4. Hiding and warning (step 5), then the mega menu decision (step 4).
5. Guide and handoff notes.

Each step ends with `npm test` green and a short entry in `docs/HANDOFF.md`.

## Decisions needed from the owner

1. Mega menu: draft now (default), or show only on sites with 2+ pages?
2. Hidden-in-export (step 5) is the default for unlinked items. Alternative: keep them visible but greyed. I recommend hiding: a greyed item on a live site looks broken.
3. Should the footer links get the same fix right after this (recommended), or stay out of scope?
