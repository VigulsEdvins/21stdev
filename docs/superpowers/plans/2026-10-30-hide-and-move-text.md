# Hide or move the small texts of a block

Status: **being built 2026-10-30 (owner request).**

## Why

Most blocks carry small informative texts the client may not want (the "WIDE-GAMUT OKLCH ENGINE" pill above the headline of the aurora hero, badges, captions). Today a client can only change the words, not remove the text or put it somewhere else.

Owner decisions: **delete = hide, and it can be shown again** (nothing is lost); **move = up or down inside its block** (swaps places with the item above or below in the same container).

## What the client will see

On every field card in the admin panel, next to "Reset":
- **Hide** (text and button become **Show again** once hidden). A hidden field disappears from the page and the preview; its card stays in the list, dimmed, so it can be brought back.
- **▲ / ▼** move the item one place up or down among its neighbours in the page. A button is disabled when there is nowhere to go.
- **Reset** puts back the words, shows it again and returns it to its place.

## What will change in the code (and why)

1. **Override runtime (`scripts/assembler.js`, shared by preview and export):** two new override types. `hide` sets `display:none !important` (the old inline value is remembered and restored). `move` takes the element's number of places up (negative) or down; it always counts from the *original* place (the original parent and next neighbour are remembered), so repeating the edit never piles up, and removing the override puts it back.
2. **Companion keys, like pictures already have `<id>__fit`:** `<id>__hide` (value `1`) and `<id>__move` (value `-3`..`3`). *Why:* the field's words keep their own key, so hiding does not lose an edit.
3. **Exported editor and live site (`scripts/cms/cms.js`, `admin.js`):** read, store, import-check and send to the builder the two keys; each field also carries its place among its neighbours (`pos`, `sibs`, measured when the block is rendered in `cms-export.js`) so the buttons know their limits.
4. **Saving (`project-sanitize.js`, `export-zip.js`):** the two types are kept and checked (`1`, a small whole number); the published values of a downloaded site include them.
5. **Not counted as words** by the guided "own words" counters.

## What stays true

- Text edits work as before. Sites saved before this have no such keys and look the same.
- Hidden is only visual (`display:none`), not deleted from the page source; a hidden pill still exists in the HTML. Say so if the client needs it gone from the source.
- The older "Content" tab of the builder (builder-extras) is not changed in this step; the admin panel is the place.

## Check

- A browser test of the runtime (hide, show again, move up and down, clamp, reset) and of the saved values; `npm run check-fields`, the admin-panel e2e tests, and the real panel.
