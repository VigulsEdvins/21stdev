# Only the library's own scripts may be published (plan, 2026-10-30)

Status: **decided by the owner 2026-10-30 ("Script allowlist"), being built.** Follows `2026-10-30-publish-subdomain.md`, section "Known limit of the server check".

## The problem

`/api/publish` accepts a list of files from the browser. HTML and SVG are scanned, but a `.js` file cannot be judged by a scan. A person who calls the endpoint directly (not through the builder) could upload their own script, which would then run on their `<name>.edvlabs.com`: a fake sign-in box, a key logger, a redirect. Today only paid places and the owner's block switch limit that. This closes it.

## What was measured first (all 238 library blocks, exported one by one)

- Every export has a **strict** script policy: no inline scripts, no `on...=` handlers, no scripts from other sites, no `eval`.
- The only JavaScript file in any export is `script.js` (`<page>.js` for extra pages). No block brings a vendor script file, and no block carries a script of its own: every section script comes from `features/<slug>/script.js`.
- Section ids look like `sec-mvve0mu2-7-14es` (letters, digits, `-`, `_`).
- Page settings do not put anything into the script except `isDark` and the list of content overrides (data).

## The approach: rebuild the expected file, compare byte for byte

A published script file is accepted only if it is **exactly** what the builder's own code would have produced. The server does not look for bad code; it checks that nothing but library code is there.

1. **Parse parameters, not code.** Walk the uploaded `script.js` from the top. The parts are known: a fixed first part (with `isDark` as `true` or `false`), then section blocks (each `slug` + `id`, normal or lazy), the fixed helper blocks (lazy runtime, dark/light button, language button, preloader), the content-overrides data, and optional fixed tails (form delivery, language-switcher wiring).
2. **Rebuild** the file from those parameters with the real generator functions (`scripts/assembler/export.js`), using the section's script text fetched from the deployed builder's own files (`/builder/features/<slug>/script.js`, through the Worker's `ASSETS`). The slug must exist there; the id must match `^[A-Za-z0-9_-]{1,64}$`; the overrides must parse as JSON in the exact canonical shape (an array of plain string fields).
3. **Compare** the rebuilt text with the upload. Any difference at all means refusal. Every byte of an accepted file therefore comes from library files, from the generator, or from validated data written with `JSON.stringify`.

Because the check uses the generator itself, there is no separate allowlist file to keep in step. After a change to a block's script, an old builder tab's export no longer matches; the person is told to reload the builder.

## The other half: no scripts outside script files

- `scanHtml` now also refuses inline `<script>` blocks (the JSON-LD data block is allowed) and `on...=` event handler attributes.
- The sites Worker adds `script-src 'self'` to its security header on every answer, so even a page that slipped something through cannot run inline or foreign scripts. This is safe because no library block needs them (measured above).
- Any `.js` file other than the page scripts is refused with a plain message.

## Not covered (stated plainly)

- The check proves the code is the library's; it does not make the library's code safe. That stays the job of `npm run security` and the code review of new blocks.
- A person can still publish a misleading page made of ordinary text, pictures and links (for example a fake notice). The owner's block switch and the paid-place requirement are the answer to that, not scripts.
- The check runs in the main Worker before anything is stored. It adds one small fetch per distinct block in the page.

## Build order

1. Refactor `export.js` so the script blocks, the overrides and the whole file come from small exported functions (behaviour unchanged; existing snapshot tests must pass).
2. `functions/lib/script-check.js`: the parser and the comparison, with the library fetch injected.
3. `scanHtml` additions, `script-src 'self'` in the sites Worker header, refusal of other `.js` files.
4. Wire into `publish()` through `deps`; the real library fetch from `env.ASSETS` in `publish-http.js`.
5. Tests: all 238 real exports pass; tampering is refused (one changed character, appended or prepended code, a changed id, an unknown block, tampered overrides, duplicated blocks, extra `.js` files, inline scripts and handlers); an end-to-end publish through the demo.
6. Deploy (push), update the testsite, record in the guide and handoff.
