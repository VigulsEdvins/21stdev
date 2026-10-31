# Latvian version of the edvlabs storefront

## What

The public storefront gets a second language, Latvian, next to English. English stays exactly where it is. Latvian lives under `/lv/`:
`/lv/`, `/lv/how-it-works/`, `/lv/pricing/`, `/lv/faq/`, `/lv/about/`, `/lv/contact/`, `/lv/start/`, `/lv/account/`, and a Latvian 404 text.
Not translated in this step (owner's choice): the page builder (`/builder/`), the guide, the style page, the example sites. Links from Latvian pages to those go to the English originals.

## Why

The owner is in Latvia and VAT-registered there; Latvian small businesses are the nearest customers. Keeping English means existing links, search results and the tests stay valid.

## How

1. **Static pages.** `site/lv/**/index.html`, one per English page, hand-translated. Same markup and classes, `<html lang="lv">`, paths one level deeper (`../../site.css`), links between Latvian pages stay inside `/lv/`.
2. **Switcher.** A small `LV` / `EN` link in the header of every page (CSS in `site.css`), pointing to the same page in the other language.
3. **Search.** Each pair of pages carries `<link rel="alternate" hreflang>` both ways plus `x-default`; `sitemap.xml` lists the Latvian pages; the sharing-tag script (`scripts/add-sharing-tags.js`) learns the Latvian pages and `og:locale`.
4. **Scripts.** `site/js/i18n.js` gives `EdvI18n.t('English text', {vars})`: it returns the Latvian text when `<html lang="lv">`, otherwise the English text unchanged. The Latvian texts are in `site/js/lang-lv.js`, keyed by the English sentence. Scripts that put words on the screen (contact, calculator, price-fill, nav-auth, start, account and its helpers) wrap those words in `t()`. Data files (`questions.js`, `recommend.js`) keep their English wording, because the builder and the tests read them; the Latvian is applied where they are drawn.
5. **Things that must not change.** Prices and the price table; answer ids stored in briefs (only labels are translated); what is sent to the lead endpoint (the consent text sent is the one the visitor actually saw, in their language); security headers (`script-src 'self'` already allows the new files); English pages and node tests (no `lang`, so `t()` returns English).
6. **Order of work.** (a) switcher + infrastructure + static pages + search tags, (b) contact / pricing / start scripts, (c) account page scripts. Each step ends with `npm test` and a look in the browser.

## Owner steps

- Read the Latvian wording once; it is a careful first translation, not a legal one. Legal and VAT wording (privacy, invoices) needs a professional (see [[edvlabs-storefront]] notes in HANDOFF).
- After deploy: check `https://edvlabs.com/lv/` loads and the live headers still pass (`npm run check-headers -- https://edvlabs.com`).
