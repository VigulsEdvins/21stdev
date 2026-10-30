# Headline field: edit every line, not only the first

Status: **being built 2026-10-30 (owner report).**

## Why

In the admin panel, the **Headline** of "OKLCH Ambient Aurora Hero" changes only the first line. The headline is `Ship interfaces with<br><span class="gradient-span">perceptual depth.</span>`. Typing a new headline replaced the first text and left "perceptual depth." in the preview.

Cause: the shared override runtime (`setText` in `scripts/assembler.js`) changes only the element's *own* text nodes so it never destroys a link or icon inside. Words that live inside a styled `<span>` (the second line here) are never touched, and the field's current value (`textContent`) includes them, so the field and the page disagree.

## What will change

1. **The field shows line breaks.** The current value of a text field now keeps each `<br>` as a new line (`scripts/builder-extras.js`), so the client sees "Ship interfaces with" and "perceptual depth." as two lines.
2. **`setText` edits the words inside styled spans too.** The text inside plain inline children (`span`, `b`, `em`, `strong`, `small`, `mark`, `u`, `sub`, `sup`) counts as part of the field. Links, buttons, icons (svg/img) and other elements are left alone, as today.
3. **Each line goes to its own part.** Lines are matched to the parts between `<br>`s, so the gradient second line stays a gradient. Inside one line only the changed words are replaced (common start and end are kept), so a bold word the client did not touch stays bold. Select-all and retype puts everything in the first part and clears the rest.
4. **Nothing changes if the value is unchanged**, and Reset still restores the original HTML.

## What stays true

- A field with no child elements behaves as before.
- Saved overrides keep working (a value without line breaks goes to the first line, the rest of the lines empty, as before for `<br>` headings).
- The same runtime is used by the preview and the downloaded site, so both are fixed.

## Check

- A unit test of `setText` on this heading (two lines, partial edit, select-all, an icon span, reset).
- `npm run check-fields` for the block, and the real builder in the browser.
