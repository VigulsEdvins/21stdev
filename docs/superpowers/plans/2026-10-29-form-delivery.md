# Form delivery: how a client's exported site receives form messages

Status: **approved 2026-10-29; all 4 steps built** (setting and checks; sending for every route in exports; guide chapter; preview note). Real services not yet tried: see the handoff. Decisions: FormSubmit as the no-account email route, one setting per site, newsletter/waitlist use the same route.

## Why

A site exported from the builder is plain files. Today 14 blocks contain a `<form>`, and none can deliver anything:

- `contact-form-validated` has `action=""` and stays a demo until the client edits the HTML.
- The other 13 (newsletter, waitlist, inquiry, multi-step, footers with sign-up) have no `action` at all.
- The check step only warns (`form-no-target`) and the deploy guide explains Formspree in prose. There is no field where a non-technical client says where messages should go.

Goal: a client who builds a site alone can choose, in one place and in plain words, **how they want to receive messages**, and the exported site then really sends them. No back end of ours is involved, so there is nothing to host, pay for or protect on our side.

## What the client will see

A new page setting, **"Where should form messages go?"** (next to the business email and phone in the page settings, shown in the guided "Get it" step too). One choice, then one short field:

| Choice | Client types | What happens on submit | Needs an account? |
|---|---|---|---|
| **Netlify Forms** | nothing | Form is marked so Netlify collects it at deploy; messages appear in the Netlify dashboard and can be emailed. | Yes, a free Netlify site (the Drop route in the guide) |
| **My email** (via a form service) | an email address | Message is sent to a form service and arrives as an email. Default service: FormSubmit (no sign-up; the first message asks the client to confirm the address). | No |
| **Formspree / Web3Forms** | the form address or access key they copied | Same, through their own account (spam filter, history). | Yes, free plans |
| **WhatsApp** | a phone number | The visitor's WhatsApp opens with the message already written to the client's number; the visitor presses send. | No |
| **Email app (mailto)** | an email address | The visitor's mail app opens with a drafted message. Works everywhere, least polished. | No |
| **My own address** | a URL | Posted as JSON/form data to the client's own server. | n/a |
| **Not yet** (default) | nothing | Forms stay as a demo, and the check step warns as today. | |

The client can leave it on "Not yet" and nothing changes for them.

## What will change in the code (and why)

1. **One setting, stored with the page** (`formDelivery`: method + value), saved in projects and in the business data like `bizEmail`. *Why:* one place to set, survives save/load and multi-page sites.
2. **Form markup adapter** (new `scripts/builder/form-delivery.js`, used by the assembler). At export it rewrites each message-type form: sets `method`/`action`, adds a hidden honeypot field, gives every input a `name` (some blocks have none, so nothing would be sent), and for Netlify adds `data-netlify`, `name` and the hidden `form-name` field. *Why:* Netlify only sees forms that are in the static HTML at deploy; and a field without a `name` is silently dropped by every service.
3. **A small runtime script** (`form-delivery-runtime.js`, copied into the export only when delivery is set). It runs after the block's own validation, then sends with `fetch` (Netlify, FormSubmit, Formspree, Web3Forms, own URL), builds the `wa.me` or `mailto:` link, and shows success or "could not send, try again" inside the block instead of leaving the page. *Why:* the default browser submit leaves the client's site for the service's thank-you page; the blocks already have success states, so we reuse them.
4. **Which forms count.** Message-type forms get delivery (contact, inquiry, multi-step, waitlist, newsletter, footer sign-ups). Search forms and the login card are excluded. A `data-edv-form="message|signup|skip"` marker on each block decides, so new blocks opt in explicitly.
5. **Security headers and strict CSP.** The strict-CSP export option and `_headers` must allow the chosen service's host in `connect-src`/`form-action` and nothing else. `npm run check-headers` is extended so a wrong host fails. *Why:* otherwise the strict option would block sending, or a loose policy would weaken the page.
6. **Check step.** `form-no-target` becomes "set where messages go" with a link to the setting; it passes when a method is chosen. A bad value (not an email, number not in international form, non-https URL) is an error. *Why:* never ship a form that silently goes nowhere.
7. **Builder preview.** The preview frame has `connect-src 'none'`, so sending is disabled there; submitting shows "Messages are sent once the site is online" and a test button is not offered. *Why:* the preview must not send real messages, and the policy is deliberate.
8. **Deploy guide and `DEPLOY.md`.** The "Contact forms" chapter is rewritten around the new setting: one short section per choice, a "send yourself a test" step, and honest limits (FormSubmit confirmation email, WhatsApp needs the visitor to press send, Netlify only works on Netlify). *Why:* the guide is what clients read after export.
9. **Tests.** Unit tests for the adapter (each method, hostile values such as quotes or `javascript:` in the value, forms without names). A browser test that exports a site and submits it against a local stand-in server for each method. CSP/header check. Update `test:searchready` and the check-step tests. Added to `npm test`.

## What this does not do (stated in the guide)

- It cannot guarantee delivery: the services are third parties and free plans have limits and spam filters.
- The client's email address or service key is visible in the page source (FormSubmit and Web3Forms work this way). The setting explains it and recommends a dedicated address; no secret keys are ever asked for or stored.
- WhatsApp messages come from the visitor's own phone; no automatic notifications.
- We do not collect, store or forward any message. Privacy notices for the client's visitors stay the client's job (the guide says so).

## Order of work

1. Setting + validation + storage + check step (small, no sending yet).
2. Adapter and runtime for Netlify, mailto, WhatsApp (no third-party accounts, easiest to verify).
3. Email via FormSubmit, Formspree, Web3Forms, own URL; header/CSP changes.
4. Guide rewrite, tests, handoff notes.

Each step ends with `npm test` green and a short entry in `docs/HANDOFF.md`.

## Decisions needed from the owner

1. Is **FormSubmit** (third party, no account) acceptable as the default "My email" route? The alternative is to list only Formspree and Web3Forms, which need a client account.
2. One setting per site (recommended), or a choice per form block?
3. Should **newsletter/waitlist** forms use the same route as contact (messages to the client's inbox) or stay out until a mailing-list route is designed?

---

## Change 2026-10-29 (owner request): move the setting into the admin panel

Decision: the setting leaves Page Settings and lives in a new **"Form messages"** tab of the admin panel, both in the builder (Content tab → Open admin panel) and in the `admin.html` that ships with a site. In the exported `admin.html` the client can change the email/number later and upload the new `cms-content.js`.

What changes, and what for:

1. **`scripts/cms/form-rules.js` (new)** holds the list of choices and the value checks, moved out of `form-delivery.js`. *Why:* the builder, the admin editor, the exported site and Node tests all need the same rules, and the admin editor is a separate page that cannot load builder files.
2. **Admin editor (`scripts/cms/admin.html`, `admin.js`)**: a "Form messages" button next to "Publishing & backup"; the tab has the same dropdown and value box as before, with the same hints and errors. The choice is stored as one extra key (`__form`) next to the content edits, so undo/redo, Publish, "Download cms-content.js", the JSON backup and "Reset everything" cover it with no new machinery. *Why:* reuse what the editor already does well.
3. **Builder bridge (`export-panel.js`)**: inside the builder, a change in the tab is written to the project (`formMethod`/`formTarget`) at once, so export and the preview note follow. *Why:* the builder export reads the project, not the editor.
4. **Exported site**: `cms-content.js` carries the chosen route as the default (`forms`) and `cms.js` hands any published override to the form script, which re-checks it before use. *Why:* the client's later change takes effect when they upload the new file, without a new export, and a hand-edited file cannot send messages to a hostile address.
5. **Always prepared forms**: every export with message forms now gets named fields, the trap box and the Netlify markers even when no route is chosen yet. *Why:* a route picked later in the editor (including Netlify) must work without exporting again. The Netlify markers do nothing on other hosts.
6. **Page Settings**: the two fields and their hint are removed. The project keeps `formMethod`/`formTarget`. The check step and the guide point to the new place.
7. **Tests**: unit tests for the moved rules and the key; a browser test that opens the exported `admin.html`, picks WhatsApp, publishes, and the site then uses it; one for the builder panel.

Limit: a client who switches to Netlify Forms in the editor still needs the site to be on Netlify; the tab says so.

---

## Change 2026-10-29 (owner request): address every security gap

The owner asked to proceed with all eight gaps listed in the security review. What can and cannot be done on a static site, and what for:

| # | Gap | What I will do | What stays true |
|---|---|---|---|
| 1 | Bots that post straight to a service skip the page's traps | Say which server-side filters each service offers and how to switch them on (Netlify: Akismet is always on, reCAPTCHA 2 optional; Web3Forms: hCaptcha free, Turnstile/reCAPTCHA on its paid plan; Formspree: its dashboard filters). **No CAPTCHA widget is built**: it only protects a form if the service verifies the token, and only some do, some on paid plans. | A static page cannot stop a direct post; only the service can. |
| 2 | Email/key visible in page source | The email address of the "My email" and "email app" routes is written into the exported HTML encoded (not readable by a simple scraper). The setting's hint recommends a service address instead. | Encoding is not secrecy: anyone reading the page script can decode it. `cms-content.js` still carries it. |
| 3 | Third parties see the messages | The Form messages tab names the service that receives the messages and tells the client to mention it in the privacy notice; guide section on privacy. | No consent checkbox is added. |
| 4 | Someone who can write files can edit `cms-content.js` | Document it (guide and README): protect the host account, two-factor sign-in. | Cannot be fixed in the page: whoever writes files owns the site. |
| 5 | `admin.html` has no login | Guide advice: keep the editor private (do not upload `admin.html`, or protect it with the host's password/access feature), and upload only `cms-content.js`. | No login is built into a file-only editor. |
| 6 | Strict policy allows every https connection | When no section script makes network calls, the strict policy limits `connect-src` to the site plus the three known form services and the chosen own address. | A new own-address host added later in the editor needs the policy edited (the guide says so). |
| 7 | Real services untested | A script `scripts/check-form-services.js` the owner runs with their own test address/keys; it sends one real test message per service **only when run by the owner**. I will not run it. | Needs the owner's accounts. |
| 8 | A fast real person could lose a message | Under 0.8 s after page load: dropped (no person is that fast). Between 0.8 s and 2.5 s: **held and sent at 2.5 s** instead of dropped. | Weaker against bots that wait, but no real message is lost. |

Also: the page script uses a prototype-less object for the fields, and a new seeded test (`tests/test-form-fuzz.js`, in `npm test`) throws hostile values at the rules, the export and the page script. *Why:* the form code was not in the existing security-regression and fuzz suites.
