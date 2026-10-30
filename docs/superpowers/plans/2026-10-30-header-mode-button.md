# Dark / light button in every header

Status: **built 2026-10-30 (see the handoff); was in progress 2026-10-30 (owner request: "the same need to create with dark/light mode"; owner chose: visitor switches the whole site, in the same 34 headers, next to the language button).**

## Why

A visitor should be able to flip a finished site between a light and a dark look from the header, like the language button. Today a page has one theme fixed at build time.

## What the client and the visitor will see

- Every header that has the language slot also shows a sun/moon button (always, also with one language; the language button still appears only with 2+ languages). It sits next to the language button.
- The visitor presses it: the whole page switches to the opposite look (a dark page becomes light and the other way round), without reloading. The choice is remembered in the visitor's browser (localStorage) and applied again on the next visit.
- The page the client builds is the default look. The other look is made automatically from it: background and text colours swap, the accent stays, card and border colours follow the new polarity.
- In the builder preview the button works but nothing is remembered.

## What will change in the code (and why)

1. **One slot, two buttons.** The existing slot `<div data-edv-lang></div>` now becomes a small container (`data-edv-lang="tools"`) holding the mode button and, when the project has 2+ languages, the language button. *Why:* the 34 headers already place the slot correctly (checked at desktop and phone width), so no header markup changes.
2. **Alternate colours.** `altTheme(theme)` (theme.js) swaps bg and text. `generateAltThemeStyles` (theme-css.js) runs the normal theme generator for that theme and puts every selector under `html[data-mode="alt"]`, so the same CSS applies when that attribute is set. Added to the page only when a header with the button is on it.
3. **Runtime.** A small script flips `html[data-mode]`, the `data-theme` of html/body/sections/nested elements and the `.dark` class of sections (same rules as `applyThemeToDocument`, so blocks with their own palette (`data-native-for`) still follow their rule), fires `themechange`, saves the choice. It runs first in the page script.
4. **Single-file export** gets the mode button and the alternate styles too (it is one language, so no language button).

## What this does not do

- Blocks that paint fixed colours of their own (no theme variables) keep them; the switch changes what follows the theme. Blocks marked with their own palette keep their palette rule.
- A returning visitor who chose the other look may see the default look for an instant before the script runs.
- No automatic start from the visitor's system setting.

## Tests

- Unit: slot becomes tools with the mode button always and the language button only when asked; alternate CSS is scoped; `altTheme` swaps; export with a header contains the alt styles and runtime once, without a header contains none.
- Browser: all 34 headers, at 1280 and 375 px: buttons on screen, no overlap, pressing flips background colour and section attributes, reload keeps the choice, pressing again returns.

## Change 2026-10-30 (owner)

The automatic swap of the page's own colours was removed. The other look is always a theme preset of the opposite polarity: the client's pick ("Other look"), else the default (dark page: Clean Minimal, light page: Midnight Dark).

## Change 2026-10-30 (owner): custom other look, and on/off in the admin panel

**Why:** the owner wants the second look to be able to use their own colours (like the Palette), and wants to switch the light/dark button on and off from the admin panel.

1. **Custom other look.** Page settings `altBg`, `altText`, `altAccent` (hex) with `altTheme: 'custom'`. `altTheme()` uses them only when all three are valid `#rrggbb` and the look is the opposite of the page's (else the default preset), so nothing unchecked reaches the CSS. UI: "Custom colours" in the builder header's Other look select (three colour inputs) and in the guided Look step.
2. **On/off.** Page setting `modeButton` (`''` = on, `'off'`). Off: the slot has no mode button, and the other look's styles and the script are left out. Admin panel: a new "Light/dark mode" tab (shown only when the site has the button) with one tick box. Inside the builder it sets `modeButton` (the preview refreshes); in the downloaded admin it is saved as `__mode: 'off'` in the published values, and `cms.js` hides the buttons and returns the page to its main look (`window.__edvMode.reset()`).
3. **What does not change:** the language button; a site where nothing is switched off.
