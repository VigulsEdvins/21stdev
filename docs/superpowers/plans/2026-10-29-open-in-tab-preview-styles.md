# Open in new tab: preview shows without styles

## What
The builder's "Open in new tab" button shows the assembled page as bare HTML (no CSS, huge unstyled SVGs).

## Why
The button opens a `blob:` URL. A blob page inherits the Content-Security-Policy of the page that made it, here the strict builder
policy (`style-src 'self'`), which blocks every inline `<style>` of the blocks. The in-builder preview avoids this by writing the page
into `preview-frame/`, which has its own policy (docs/security/builder-csp.md).

## Fix
`scripts/builder/page-controls.js`: open `preview-frame/` in the new tab (synchronously, so pop-up blockers allow it), then write the
assembled page into it with document.open/write/close, same as frame-doc.js. No blob URL, no change to any header.

## Check
Open the builder, build a page, click Open in new tab: styles show. Playwright check against the local server.
