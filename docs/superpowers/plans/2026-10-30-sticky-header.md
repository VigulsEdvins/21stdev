# Sticky header: the client chooses whether the header stays at the top

Status: **built 2026-10-30 (owner request); see the handoff.**

## Why

The owner wants the client to choose whether the header stays at the top of the screen while scrolling or scrolls away with the page.

Finding (tested in a real browser, 2026-10-30): **no header sticks today.** Two header blocks (`sticky-shrink-header`, `dither-sweep-navbar`) set `position: sticky` on an element *inside* their section. A sticky element can only move within its parent, and every block sits in its own `<section class="page-section">` that is only as tall as the header. After scrolling 1200 px the header was 1200 px off screen in all three headers tested. It only works in a block's stand-alone demo. So a setting that just switched that CSS would do nothing.

## What the client will see

- In the admin panel, on a header: a card **"Header stays at the top"** with one tick box. Ticked: the header stays visible while the page scrolls (and the menu links scroll under it, not behind it). Unticked: it scrolls away with the page.
- A header added from the block list starts ticked for the two blocks made for it (`sticky-shrink-header`, `dither-sweep-navbar`) and unticked for the others. Headers in saved sites keep their current behaviour (they scroll away, as they do now).
- Applies to the headers of the "Headers & Nav" category, except the bottom tab bar (it sits at the bottom, not the top).

## What will change in the code (and why)

1. **The section is made sticky, not something inside it.** `.page-section.is-sticky { position: sticky; top: 0; z-index: 50 }` in the shared page CSS. The section is a direct child of the page, so it can stay while the others scroll. *Why:* it is the only element that has the whole page as its parent.
2. **Stack field `sticky: true`** (absent = scrolls). The assembler adds the class in the export, the single file and the preview. Saved with the project (`project-sanitize.js` keeps only `true`; remember this: unknown section fields are dropped on save).
3. **Default for new headers:** `stickyDefault: true` in the block's `meta.json`, copied to `registry.js`, applied by `insertSection` like `menuMode`.
4. **Admin card** via the existing builder bridge (`stickyInfo`, `setSticky`), next to the menu cards. Not in the downloaded `admin.html` (the finished site's markup is fixed there).
5. **Preview** reloads on a change (the structure key already covers every stack field).

## What this does not do

- It does not make a header shrink or change look when stuck: the two blocks that shrink keep doing it.
- It does not make a footer or any other block sticky.
- Existing saved headers do not change by themselves.

## Tests

- Unit: the class appears only when `sticky` is true; the sanitizer keeps `true` only; new headers get the default from the registry.
- E2E: in a real page, a ticked header stays at the top after scrolling 1200 px and an unticked one scrolls away; the admin card changes it and the preview follows; the export has it.
