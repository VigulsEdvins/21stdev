# Language button in every header

Status: **built 2026-10-30 (see the handoff) (owner request: "all headers add language switch buttons"; owner chose "button inside each header").**

## Why

Today a second language adds a separate "Language switcher" block at the top of each page, above the real header. The owner wants the language button to be part of every header instead, so visitors change language from the header they already see.

## What the client will see

- A site with **one** language: headers look exactly as now (no button).
- Add a second language (Languages box): every header of the "Headers & Nav" category shows a globe + language code button with a menu of the site's languages. Choosing one opens that page in the chosen language (same behaviour as the existing switcher block).
- The separate switcher block is **no longer added** to a page that has a header with the button. A page with no such header (no header at all, or only the bottom tab bar) still gets the block, so visitors always have a way to switch.
- Pages that already have the block keep it. Nothing is removed from saved sites.

## What will change in the code (and why)

1. **Slot in the header markup.** Each header's `index.html` gets `<div data-edv-lang></div> ` where the button should sit (`responsive-burger-menu`, `dither-sweep-navbar`, `frosted-glass-menu`, `centered-logo-header`, `search-first-header`, `split-nav-announcement`, `sticky-shrink-header`, `mega-menu-header`). Empty and invisible on its own, so stand-alone demos do not change. `bottom-tab-bar` is skipped (tabs, not a header bar) and `multilingual-lang-switcher` already has the button.
2. **One shared implementation** in a new `scripts/assembler/lang-slot.js` (markup, CSS, JS written once, not copied into 8 designs). It uses the same class names as the switcher block (`lsw-lang`, `lsw-menu`, `lsw-code`) so `wireLanguageSwitcher` (export), `cms.js` (languages turned off in the admin) and the builder's `__edvLangs` host work unchanged.
3. **Assembler.** In the export, a slot becomes the button only when the page belongs to a translation group of 2+ languages (option `langSwitch`, passed by `export-zip.js`); otherwise the slot is removed. Page CSS/JS for the button is added once, only when a slot is kept. In the live preview the button is added hidden and shown by script when the builder reports 2+ languages.
4. **`wireLanguageSwitcher`** handles every switcher on the page (not just the first) and un-hides slots.
5. **`languages.js`**: `addLanguage` adds the block only to a page without a header that has the button. A new registry flag `langSlot: true` (in `meta.json`, copied to `registry.js` by `npm run sync`) marks those headers.
6. **Layout** per header: small rules in each header's `style.css` so the button sits in the bar (checked at desktop and phone width).

## What stays true

- No change for one-language sites. No change to saved projects. The bottom tab bar is untouched.

## Tests

- Unit: slot kept/removed by option; CSS/JS added once; wire handles two switchers; `addLanguage` skips the block for a page with a button-capable header.
- Browser: for each header, add a language, button visible, menu opens, choosing opens the other page; phone width; one-language export has no button.

## Scope widened 2026-10-30 (owner)

The owner meant every header, not only the "Headers & Nav" category. The same slot was added to the top bar of the Landing Pages blocks and the two Heroes with a menu (26 blocks). Blocks without a top bar (console, desktop dock, sidebar menu, bottom tab bar) are left alone.
