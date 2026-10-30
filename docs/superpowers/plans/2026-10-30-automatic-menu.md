# Automatic menu: the header lists the page's sections by itself

Status: **approved 2026-10-30 with the recommended answers (saved headers stay manual, opening banner left out, other pages not included). Built; see the handoff.** Follows `2026-10-29-header-links.md` (all 5 steps built, not yet committed).

## Why

Today every menu item in a header is typed by hand: its text and where it goes. A client with five sections must create five items, link each one, and update the header whenever a section is added, removed or moved. The owner's request (2026-10-30): the header should **add and remove its items by itself**, one text link per section, each scrolling to its section.

The pieces needed already exist from the header-links work: every section has an anchor name (`#pricing`), every exported menu item can go to one, and items with no destination are left out.

## What the client will see

- **Header setting "Menu": Automatic / My own items.** A header added from now on starts on *Automatic*. Headers already in saved sites stay on *My own items*, so nothing on a live or saved site changes by surprise.
- **Automatic:** the header shows one text link per section, in page order. Add a section and an item appears; remove, hide or move one and the menu follows. The button (for example "Get started") and the logo are not part of this; they stay as they are.
- **Which sections count.** Every section except: headers, footers, preloaders, hidden sections, and the very first section when it is an opening banner (the logo already goes to the top).
- **Control per section** (admin panel, next to "Link name of this section"): *Show in menu* (on by default) and *Menu label* (default: the everyday word for the block, such as "About", "Pricing", "FAQ", "Contact"; for other blocks its title).
- **Room.** Each header design has a number of items that fit (6 to 8). Sections beyond that are not shown, and the page check says which ones to switch off.
- **My own items** works exactly as built in the header-links work (text and link per item, items with no link left out).

## What will change in the code (and why)

1. **Header markup says where the menu goes.** In each supported header the list of items gets `data-edv-menu` (and `data-edv-menu-max="N"`), and the first item is the pattern the others are copied from. A header with a left and a right list (centered logo, split nav) marks both; the items are shared out between them. The burger menu's two-digit numbers (01, 02...) are counted by the generator. *Why:* the generator must not guess a design's markup.
2. **New pure module `scripts/builder/menu.js`** (works in the builder and in Node tests, like `anchors.js`): given a header's markup and the list of items `{ label, anchor }`, returns the markup with exactly those items. It copies the pattern item, sets its text and `href="#anchor"`, removes the original, and gives each item `data-edv-nav` numbers so the existing checks and hiding keep working.
3. **The assembler calls it** in the same place it already links and hides items (`navLinker`), for the export, the single file and the builder preview. The items are written into the page as plain HTML, so the menu works without scripts and search engines see the links. *Why not a script in the page:* menus built by script are invisible to people with scripts off, to search engines and to the checks.
4. **Stack data.** The header section gets `menuMode` (`auto` | `manual`, missing means manual); any section can get `menuLabel` and `inMenu: false`. Saved in projects and history like `anchor` already is. The builder's "add a block" adds new headers with `menuMode: 'auto'`.
5. **Admin panel (builder).** On a header: a "Menu" card (Automatic / My own items, with the list of items it will show). On other sections: "Show in menu" and "Menu label". In *Automatic* mode the header's manual item fields are replaced by a note, so there is only one way to change it at a time.
6. **Preview.** The live preview adds sections without reloading (`preview-patch.js`), which would leave the header stale. A change that alters the menu (section added, removed, moved, hidden, renamed, label or toggle changed) triggers a full preview reload when the page has an automatic menu. Slower for that case only; correct.
7. **Page checks.** New warnings: *automatic menu with no sections to list* and *N sections do not fit the menu* (naming them). The existing `nav-no-link` stays for manual items.
8. **Downloaded editor (`admin.html`).** The menu in a finished site is fixed text; the editor does not rebuild it. The guide says: to change the menu, change it in the builder and export again.

## Which headers

| Header | Automatic menu |
|---|---|
| sticky-shrink, burger menu, language switcher, dither navbar | yes (one list) |
| centered-logo, split-nav | yes (two lists, shared out; split-nav keeps Search, Account, Bag as its own items) |
| frosted-glass-menu | **no**: its three columns have headings of their own ("The club", "Visit"); stays *My own items* |
| search-first-header | **no**: its links are shop categories and cart, not page sections; stays *My own items* |
| bottom-tab-bar, mega-menu (draft) | no (not links / draft) |

## What this does not do

- It does not list the **other pages** of a multi-page site. A menu of pages is a different question (what is the page order, which pages are in the menu); the link picker already lets a client link to a page by hand.
- It does not make dropdowns or sub-menus.
- It does not change a finished site's menu after export.

## Tests

- Unit (`tests/test-menu.js`): one item per eligible section; skipped headers, footers, hidden, preloaders and an opening banner; label defaults and `menuLabel`; `inMenu: false`; more sections than room; two-list headers share out; the burger's numbers; hostile labels (`<script>`, quotes) are escaped; no sections gives an empty menu, never broken markup.
- E2E (`tests/e2e/auto-menu.e2e.js`): five sections give five items that scroll to their sections; adding, removing, moving and hiding a section changes the menu in the preview and the export; an old header stays manual; switching to *My own items* gives the manual fields back.
- Existing: `npm test`, `check-fields`, `check-exports`, header-links e2e; `check-features` on the six headers.

## Order of work

1. `menu.js` and its unit tests (no visible change).
2. Mark the six headers' markup (`data-edv-menu`), `check-features`.
3. Stack fields, assembler call, export and single file.
4. Admin panel cards, preview reload, page checks.
5. E2E, guide sentence, handoff notes.

Each step ends with `npm test` green and a short entry in `docs/HANDOFF.md`.

## Decisions needed from the owner

1. **Existing headers:** stay on *My own items* (recommended, no surprises) or switch to *Automatic* when a site is opened?
2. **The first section:** leave it out of the menu when it is an opening banner (recommended), or list every section?
3. **Other pages of a multi-page site:** not in this change (recommended), or add them as items too?
