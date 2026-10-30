# Languages in the admin panel

## What the owner asked

In the admin panel (admin.html, the content editor that ships with an exported site): switch the website's language and
write the translation for it there, and choose how many languages the site offers.

## What is wrong today

The builder already makes one linked page per language (`translationOf`, `lang`). The exported admin only sees a flat
list of pages ("Home", "Home (Latviešu)"). It knows nothing about languages, so there is no way to say "show me the
Latvian version", no view of the original words next to the translation, and no way to turn a language off.

## What will change

1. **Export** (`cms-export.js`, `export-zip.js`): each page in `cms-content.js` also carries `lang` and `group` (the
   original page it belongs to), and the file gets the `siteLang`.
2. **Admin** (`admin.html`, `admin.js`, `admin.css`):
   - A **Language** picker above Page (shown when the site has two or more languages). Choosing a language opens the
     matching page of the page you were on; the Page list shows only that language's pages.
   - Under each field of a translated page, the original wording ("In English: ...") so it can be translated in place.
   - A **Languages** tab: one tick per language, the first language always on. Unticked languages disappear from the
     language switcher of the live site. Each row shows how many fields still match the original wording (not
     translated yet). Saved as `__langs` in the published values, like `__form`.
3. **Live pages** (`cms.js`): applies `__langs` by removing unticked languages from the switcher menu, and hides the
   whole switcher when only one language is left.

## What stays true

- Old `cms-content.js` files (no `lang`/`group`) keep working: no picker, no Languages tab.
- Adding a brand-new language that was not exported still happens in the builder (it creates the pages); the admin
  chooses which of the exported languages are on. Re-export after adding one.
- Nothing is built from text with innerHTML; values are checked on import like the other settings.
- Pages of an unticked language still exist as files; they are only removed from the switcher.

## Owner steps

Re-export a site that has two or more languages, upload the new files, open admin.html.
