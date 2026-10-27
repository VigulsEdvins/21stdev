# edvlabs storefront — design (what we are building and why)

Written 2026-10-27. Companion to the task plan: [../plans/2026-10-27-edvlabs-storefront-plan.md](../plans/2026-10-27-edvlabs-storefront-plan.md).
Status: **draft for approval**. Nothing in this document has been built. Calls that are mine, not yours, are marked **[my call]**.

## 1. Intent

edvlabs becomes a business that **sells landing pages and small websites**. Until now the vault is a private tool. Before it goes public it has to work for a stranger: a small-business owner with no code skills who wants a page for themselves or their company.

A visitor answers a short set of questions about the page they need (every question has an "I don't know" answer). At the end they choose one of two ways:

1. **Build it myself (no code).** They register, open the builder (pre-filled from their answers), choose sections, change the text, customise the look, then pay and take the finished site. Price depends on the number of sections and on whether they want an admin panel.
2. **edvlabs builds it for me.** They leave an email or phone number. Everything they answered is sent to the owner. The price is the same self-serve price plus the owner's work.

The whole public site and the builder are redesigned in an **editorial, warm** style so that nothing looks machine-made.

## 2. Goals

- A stranger can go from "I need a page" to a paid, downloadable site (path 1) or a clear request for help (path 2) in one sitting, without help.
- The owner receives complete, readable briefs and can see leads, orders and prices in one place.
- The price shown is always the price charged (one calculator, checked on the server).
- Plain language everywhere. No developer words ("registry", "IDE workbench", "zero dependency lock-in").
- The product does not look AI-made: a specific list of things to avoid is in the plan (E1.4).

## 3. Non-goals (for the first public version)

- Hosting customers' sites, domains and email (listed as post-launch, E15).
- A login-based hosted CMS for customers' end clients (see decision D5).
- AI assistance (dropped on 2026-10-27, see `docs/ROADMAP.md` I3).
- Marketplace features, reseller accounts, teams, white-label.
- Languages other than English for the storefront itself (the *sites people build* can be multilingual; the storefront translation is E15).

## 4. Anti-goals (would make this a failure even if it "works")

- A visitor has to understand what a "section", "widget" or "mood" is before they can get started.
- The shown price differs from the charged price.
- A secret, a customer's data or a paid download leaks because a check was skipped.
- A paid site can be downloaded by someone who did not pay, and nobody notices.
- The owner has to copy and paste answers out of an inbox to understand a lead.
- Personal data (emails, phone numbers) is collected without a clear reason, a privacy notice and a way to delete it.
- It looks like every other gradient-and-glow startup page.

## 5. What already exists and will be reused

| Need | What exists today |
|---|---|
| 235 sections, all `own` licence, with thumbnails, mood / industry / weight tags | `features/`, `registry.json`, `thumbs/` |
| Builder: sections, themes, page settings, undo, projects, kits, starters per industry | `builder.html`, `builder.js`, `scripts/builder/` |
| Edit text, images, links, colours per section | Content tab, `customizable` fields |
| Content editor (admin) shipped inside every ZIP | `scripts/cms/`, `admin.html` (see D5) |
| Exports: ZIP, single file, React project, review copy, multi-page, SEO files, `DEPLOY.md` | `export-*.js` |
| Strong test net: unit, 44 browser tests, export matrix, Lighthouse, a11y | `tests/`, `scripts/check-*.js`, CI |

What does **not** exist: accounts, a database, a server API, payments, email sending, a public website, a questionnaire, a price calculator, an owner back office. The vault is a static site with `localStorage`. This is the first time it needs a backend, which reverses the "I1 optional backend: not now" decision.

Things found in the code that matter for going public:

- Three full-site templates (`template-yearbook`, `-arena`, `-roster`) and two own sites (`mom`, `cvmaker`) are served from **sibling folders outside this repo** (`scripts/serve.js`). A public deployment has to include them or hide those templates (task E14.2).
- Exports are generated **in the visitor's browser**. A paywall in front of a browser-side export can be bypassed by a determined person. Decision D4 covers how strict to be.
- The Git remote is `VigulsEdvins/21stdev`. Do not push or rename it without asking (existing instruction).
- The licence column says `own` for all 235 components, which is what a commercial product needs; the plan still adds a final licence and asset check (E12.6) because stock-like images in `assets/library/` and the five templates from sibling folders were not part of that audit.

**Security** is a goal of its own: every line of code (components, builder, storefront, server functions, CI, infrastructure) is checked automatically on every change and reviewed by hand, and no real payment is taken before an outside penetration test has no open high or critical finding. See epic E16 in the plan.

## 6. Approaches considered for the technical base

### A. Static front end + Supabase + Stripe + an email service (recommended) **[my call]**
Public pages, wizard and builder stay static files on a CDN (Cloudflare Pages or Netlify). Supabase provides sign-up / login, a Postgres database with row-level security, file storage and small server functions. Stripe Checkout takes payment; a webhook marks the order paid. Resend (or Postmark) sends email.
- Good: no server of your own to patch or keep up; EU region available; the existing JavaScript builder is reused as is; cheap at low volume; fastest way to a working product.
- Trade-off: a vendor to depend on (the data is plain Postgres, so leaving is possible); server functions are written in TypeScript/Deno, which is new to this repo.

### B. Your own Node API on a small server
Express or Fastify with Postgres, sessions, Stripe, email. The repo is already Node.
- Good: full control, one language, no vendor.
- Trade-off: you carry security, password storage, session handling, backups, updates, uptime and scaling. For a one-person business this is the costliest in time and the easiest place to make a serious mistake.

### C. Forms and payment links, no accounts at first
A hosted form tool (Tally, Typeform) for the questionnaire, Stripe Payment Links for money, and email for done-for-you. Builder stays free and local.
- Good: can be live in days; no backend at all.
- Trade-off: no registration, no saved projects, no price tied to the real section count, easy to share a paid ZIP. It cannot deliver the plan you described. It is useful as a **stop-gap for done-for-you leads only** (see Phase 1).

**Recommendation:** build in two phases on approach A. Phase 1 launches the public site, the questionnaire and the **done-for-you** path (needs email only, no accounts, no payments). Phase 2 adds accounts, saved projects, pricing, checkout and downloads for the **do-it-yourself** path. This earns money and teaches you what people actually ask for before the harder half is built.

## 7. Decisions I need from you (D1–D8)

I have proposed an answer for each so work can continue; change any of them.

| # | Decision | My proposal |
|---|---|---|
| D1 | Technical base | Approach A (Supabase + Stripe + Resend), two phases |
| D2 | Who is the seller, and VAT | Your own legal form decides this; ask an accountant before the first sale. The plan assumes prices are shown **with VAT included** for consumers and Stripe Tax or a merchant-of-record service (Paddle, Lemon Squeezy) is evaluated in E8.1 |
| D3 | Price model | A base price + a price per section (with a few sections included) + an add-on for the admin panel. Numbers are yours; the plan builds a price table you can change without code. Done-for-you = the same price + a work fee per section complexity |
| D4 | How strict is the paywall | Phase 2a: "soft" gate (the download is only offered after payment, the unpaid preview carries a visible mark). Phase 2b: build the ZIP **on the server** after payment so it truly cannot be taken without paying |
| D5 | What "admin panel" means for a customer | Today it is a local editor that produces a content file the customer uploads. v1: sell that as "Editor included" and describe it honestly. A real login-based admin that works from the web is a separate product (E11.4, post-launch) |
| D6 | What the customer receives | v1: the ZIP, the single file, a deploy guide. Hosting and domain are not included (E15). The customer owns the output |
| D7 | After purchase | Unlimited re-download and edits of that project for 12 months; adding sections later pays the difference |
| D8 | Languages of the storefront | English first. The builder output can already be multilingual |

## 8. Look and feel: the direction you chose

**Editorial and warm.** The reference is a well-made printed magazine, not a software dashboard.

- Colour: warm paper background, near-black ink, one accent colour used sparingly (a clay or ochre red, not purple). Dark mode is optional and secondary.
- Type: a serif for headlines with some character, a plain sans for interface text, a mono only for small labels. Fonts are self-hosted (no Google request, better for privacy law and speed).
- Layout: a visible grid, generous margins, real asymmetry, rules and numbered sections; text that is written for the page, not placeholder.
- Images: **real screenshots** of the real templates and the real builder, not stock photos or 3D blobs.
- Details that show a person made it: a short note from you, honest limits ("what we do not do"), small hand-drawn marks or stamps, a real process timeline.

The "looks AI-made" list that the plan turns into a checklist: gradient headlines, glowing grids and orbs, glassmorphism, purple-to-blue gradients, emoji as icons, identical rounded cards in a row of three, "supercharge / seamless / unlock" copy, badge-pill eyebrow labels on everything, centred hero with two buttons and a screenshot under it.

## 9. How it is done (parts decided by you, parts by me)

**You decided:** scope is the builder and the catalogue (not only a landing page); the visitor is a small-business owner with no code skills; the style is editorial and warm; design is shown and approved before any rebuild; two paths (self-serve with registration and payment, or done-for-you with a contact); price by section count and admin panel.

**My calls:** the phased order (done-for-you first), approach A, the decision proposals D1–D8, renaming categories to everyday words, hiding advanced filters behind an "Advanced" switch, and a single shared price calculator.

## 10. What is left to whoever builds it

Exact prices, exact wording of the questions, the final colour and font choices (the plan has a design step with two options for you to choose between), legal texts (to be written or reviewed by a professional), and the order of the post-launch items.

## 11. Market prices (looked up 2026-10-27)

Figures come from review and comparison sites, which are often affiliate-supported, and some sources disagree. **Confirm every number on the vendor's own pricing page before it is used in a decision or on the site.** The Latvian market could not be priced from search results (no concrete euro figures found); ask two or three local freelancers or agencies for real quotes (task E-research below).

### Do-it-yourself builders (subscriptions, hosting included)

| Product | Entry paid plan | Typical business plan | Notes |
|---|---|---|---|
| Wix | Light $17/mo (annual) | Core $29/mo, Business $39/mo | 14-day trial; monthly billing about 40% more |
| Squarespace | Basic $16–19/mo (annual) | Core $23/mo, Plus $39/mo | Sources disagree on Basic and Core |
| Webflow | Basic about $15/mo | Premium about $25/mo (annual) | Restructured May 2026; older pages show $14 / $23 / $39 |
| Framer | Basic $10/mo (annual) | Pro $30/mo | Charged per site |
| Carrd | Pro Standard $19/year | Pro Plus $49/year | One-page sites, very cheap |
| Mozello (Latvian) | Premium about €7/mo (annual) | Premium Plus about €15/mo | Local platform named by LIAA |

### One-time templates (no hosting)
Landing page templates for Framer and Webflow mostly cost **$15–40** once (some free, a few up to $99); the site plan to host them is a separate $5–15 per month.

### Done-for-you (freelancers and agencies)
- Europe, small-business landing page: **about €300–1,500** from a competent freelancer; template-based work at the low end (Italy €100–300 for a basic template page, €300–1,000 customised; France €100–1,000 typical).
- General estimates: freelancer $300–1,500, agency $800–3,000, bespoke $5,000+; Eastern Europe about 0.55× Western Europe; hourly $25–50 (Eastern Europe) to $60–100 (Western Europe).

### What this means for edvlabs (my reading, not data)
- Your self-serve product is closer to a **template with an editor** than to a subscription builder: the customer pays once and gets the files, but hosting is their own cost. That makes a **one-time price** the natural model, and it should sit well above a $15–40 template (you give a guided build, 235 sections and an editor) and well below a freelancer's €300+.
- Subscriptions (Wix, Squarespace) cost a small business roughly **€150–350 per year including hosting**; a one-time €80–200 with ~€5–10 per month hosting somewhere else is competitive, and you should say so plainly.
- Done-for-you should land **inside the freelancer band** (about €300–800 for a typical 5–8 block page), because that is what a customer compares you to.

**Draft starting point for E5.1 (accepted by the owner on 2026-10-27 as the starting point; still to be tested against local quotes and costs):**

| Item | Draft |
|---|---|
| Self-serve base (includes 3 blocks, header and footer free) | €39 |
| Each extra block | €9 |
| Editor add-on ("admin panel") | €39 |
| Example: 7 blocks, no editor | 39 + 4 × 9 = **€75** |
| Example: 7 blocks with editor | **€114** |
| Done-for-you work fee | €150 set-up + €35 per block (heavier blocks more) |
| Example: 7 blocks done for you, with editor | 114 + 150 + 7 × 35 = **€509** |

Check these against: what a local freelancer quotes, what you earn per hour at the done-for-you fee, and what Stripe and VAT take (see D2 and E8.1).

**Research task added to the plan:** E-research — ask 3 local freelancers or agencies for a quote for the same 6-block landing page, collect 5 more competitor pages with prices, and record the date; redo each year.
