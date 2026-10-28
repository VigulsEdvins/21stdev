# Launch scope: everything built and designed before anything is published

Written 2026-10-28 after the owner said nothing goes live until all functionality and the builder's new design are done. This orders the remaining work from `2026-10-27-edvlabs-storefront-plan.md`. Nothing here is published or pushed; staging is the only place anything runs.

## What "done" means

A stranger can: answer the questions, choose to build or to hand over, build a page in the new builder, pay, download the files, come back later and change it, and the owner sees every lead and order. All of it in the E look, tested, with legal texts reviewed.

## The builder redesign: the approach

The current builder (`builder.html`, 1,136 lines of markup, 3,303 of CSS, 40 of the 49 browser tests depend on it) is a power tool. Two ways to give it the new design:

- **A. Guided layer in the same page (recommended).** Keep the engine and every DOM id the tests use. Restyle all of it with the E tokens, then add a **guided mode** (default) that shows one of five steps at a time (Blocks, Words, Look, Check, Get it) and hides the power panels; an **Advanced** switch brings today's panels back. Low risk, tests keep passing, redesign ships in slices.
- **B. New page on top of the engine.** Cleaner screens, but the preview frame, export and history modules all read ids from `builder.html`, so most of them would be rewritten and retested.

Choose A unless the owner prefers B. Slices, each committed and tested on its own:

1. Skin: E tokens, fonts and components across the builder chrome (header, sidebar, stack, drawer, modals); dark mode kept.
2. Guided shell: five-step bar, one job per step, Next and Back, Advanced switch that remembers its state (E6.2).
3. Step 1 Blocks with everyday names, short featured list, reorder by keyboard (E6.3).
4. Step 2 Words: field list with human labels, click-to-edit on the preview, sample-text counter (E6.4).
5. Step 3 Look: colour sets, font pairs, roundness with a contrast guard (E6.5).
6. Step 4 Check in plain words with one-click fixes (E6.6).
7. Step 5 Get it: price meter equal to the calculator, editor choice, download (E6.7), "Ask edvlabs to do it" at every step (E6.8).
8. Help, safety nets, mobile behaviour, performance (E6.10 to E6.12).
9. Entry from the questions: the brief fills the builder in one click (E6.1, E3.4 recommendation rules).

## Everything else, in order

| # | Work | Can be built and tested without the owner's accounts? |
|---|------|---|
| 1 | Builder redesign, slices above | Yes |
| 2 | Recommendation rules from the brief (E3.4) and Examples page (E2.4) | Yes (screenshots of the owner's own templates; owner picks which) |
| 3 | Price table as data, quotes, editor packaging (E5.2 to E5.4, E11.2, E11.3) | Yes |
| 4 | Accounts, projects in the account, entitlements, dashboard, downloads (E4, E7, E10) | Built against a local test database and a fake sign-in; **going live needs the owner's Supabase account** |
| 5 | Checkout, webhooks, invoices, refunds (E8) | Built and tested against Stripe test mode with a local fake; **needs the owner's Stripe account and the accountant's invoice rules** |
| 6 | Owner back office: lead list, orders, price editor (E9.3 to E9.5) | Yes, behind the same sign-in |
| 7 | Remaining security (E16.4 to E16.14) | Mostly yes; the outside test needs a person |
| 8 | Accessibility, performance, analytics (E13) | Yes |
| 9 | Legal texts (E12) | **Drafts yes; a professional must review before launch** |
| 10 | Usability test with five real people (E13.6) | **Needs people** |
| 11 | Staging, soft launch, launch (E14) | **Needs the owner** |

## Cannot be finished by Claude alone

Account logins (Cloudflare, Supabase, Stripe, Resend), real payments, the legal review, the accountant's invoice set-up, usability testing with real people, and the final go-live decision. Everything else is built, tested and left on staging.

## Decisions still open (defaults in the design doc apply if unanswered)

Revision rounds and timing for "we build it"; the VAT rule; the refund rule; mobile building (default: preview and checkout on a phone, building on a computer); D2, D4, D5, D6.

## Backlog: parked on purpose, not started

Items the owner has seen and decided to leave for later. Do not start one without being asked.

- **B1. Google's sign-in screen shows the long Supabase address (parked 2026-10-28).** Google's account chooser says "continue to idvirglyjvqneaudnsuu.supabase.co" instead of "edvlabs". Supabase's documentation names two fixes:
  1. **Verify the brand with Google (free, recommended; takes a few business days).** In Google Auth Platform → Branding set app name `edvlabs`, a square 120×120 logo, home page `https://edvlabs.com`, privacy policy and terms links, authorized domains (`edvlabs.com` and the full Supabase project domain `<ref>.supabase.co`, not the bare `supabase.co`), developer contact email; prove ownership of `edvlabs.com` in Google Search Console (one TXT record in Cloudflare DNS); keep the app "In production"; then press "Verify branding" in the Verification Center. Needs from Claude when it is taken up: a **Privacy policy page** and a **Terms page** on the site, clearly marked as drafts for a professional to review (these are E12.1 and E12.2 in the storefront plan; Google needs the privacy page before it will verify), footer links to both, and a **120×120 logo** made from the sun-and-circle mark. Needs from the owner: the Search Console verification, the Branding form, and the review wait.
  2. **A custom domain for Supabase (paid).** A Supabase Pro plan add-on (about $10 a month) lets the project answer on a domain such as `auth.edvlabs.com`; Google then shows that instead. The callback address in the Google and GitHub apps and in `docs/deploy/accounts.md` would change. Worth doing later if everything should sit under the owner's own domain.
  Until then the sign-in works as it is; the long address is only cosmetic.
