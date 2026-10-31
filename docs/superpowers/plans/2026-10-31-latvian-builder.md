# Latvian version of the page builder

## What

The builder gets a Latvian screen language at its own address, `/lv/builder/` (the English one stays at `/builder/`). The storefront's Latvian pages link to it. First step (owner's choice): the guided flow and the main screens a beginner sees; the advanced panels (export, admin panel editor, widget catalogue) follow in a second step and show English until then.
What is NOT translated, on purpose: the blocks and their sample words in the preview (that is the visitor's page, not the builder's screen), the user's own text, exported files, the deploy guide.

## Why

The storefront is now Latvian-capable; a Latvian visitor who presses "Start building" should not land in an English tool.

## How

1. **One translator for the whole screen**, `scripts/builder/ui-lang.js`: when `<html lang="lv">`, it walks the page once and then watches it (MutationObserver), replacing text nodes and the `title`, `aria-label`, `placeholder`, `alt`, `value` (buttons) attributes whose text is in the Latvian dictionary `scripts/builder/ui-lang-lv.js` (exact English sentence → Latvian; texts with numbers use `{n}`-style templates). Why not wrap every string in a function as on the storefront: the builder is ~40 scripts that build screens everywhere, and the translator catches static and generated text alike without touching their logic. A text not in the dictionary stays English, so nothing breaks. It skips the preview frame (a separate document), inputs' typed values, `contenteditable` and anything marked `data-no-i18n`.
2. **Address.** `scripts/build-site.js` also writes `dist/lv/builder/index.html`: the staged builder page with `lang="lv"`, a `<base href="/builder/">` (so scripts, styles, `features/`, `thumbs/` and the preview frame are the same files, not copies), the contact link to `/lv/contact/` and the "back to the site" links to `/lv/`. `base-uri 'self'` already allows the base tag.
3. **Headers.** `site/_headers` and `scripts/check-headers.js` give `/lv/builder/*` the same rules as `/builder/*`.
4. **Entry points.** The Latvian storefront pages send "I will build it" / account links to `/lv/builder/`; `/lv/account/` returns to it.
5. **Checks.** A unit test for the translator (exact, template, attributes, skips). A test that every dictionary key is a text really present in the builder sources, so the dictionary cannot rot. An e2e run of the guided flow in Latvian that lists any text left in English on the main screens.

## What stays true

English builder, its tests, the exported files and the preview are unchanged. Nothing in a saved page depends on the screen language.

## Owner steps

Read the Latvian wording; after deploy open `/lv/builder/`.
