# edvlabs design tokens

Direction **E, mid-century poster**, chosen by the owner on 2026-10-27. The tokens live in `site/styles/tokens.css`; this page says what each is for. `npm run check-brand` measures every colour pair against WCAG 2.2 AA.

## Colour

| Token | Value | Use | Never |
|---|---|---|---|
| `--paper` | `#f4ead3` | Page background | Text |
| `--paper-raised` | `#fbf5e4` | Cards, form fields on paper | — |
| `--teal` | `#1f5c5a` | Hero, builder stage, sidebar: a deep field | Small text in mustard or rust |
| `--mustard` | `#e2a627` | Highlight field, price panel, band, sample-text mark | Text on paper; small text on teal |
| `--rust` | `#c4522a` | Button fills, big shapes (circles, arches) | Text on paper (use `--accent-text`) |
| `--ink` | `#1d2a33` | Text, outlines, footer, builder bar | — |
| `--accent-text` | `#a8401a` | Kickers, links and labels in rust on paper (5.1:1) | Fills |
| `--accent-on-teal` | `#e2a627` | Large mustard words on teal, mustard on ink (3.6:1 on teal, so 24px and up only) | Small text on teal |
| `--text-on-rust` | `#ffffff` | Button text on rust (4.6:1) | Cream on rust (only 3.8:1) |
| `--ok` / `--error` | `#2f6a2d` / `#a3261b` | Saved status, error messages | Colour alone: always add words or an icon |

Do not put `--text-muted` on mustard (about 3.6:1): text on mustard is always `--text-on-mustard`. Findings from the measuring, now fixed in the tokens: rust on paper was 3.8:1 (too low for small text), so text uses the darker `--accent-text`; cream text on rust was 3.8:1, so buttons use white; mustard on teal is 3.6:1, so it is limited to large words.

## Type

- Headlines: **Gloock** (one weight). Text and interface: **Work Sans** 400 and 600. Both are open-licence and self-hosted in `site/fonts/` (Latin and Latin Extended, so Latvian text works).
- Scale: display `clamp(48px, 6vw, 86px)`, h1 `clamp(38px, 4.8vw, 62px)`, h2 `clamp(32px, 4vw, 48px)`, h3 28px, lead 21px, body 18px, small 15px, label 13px (uppercase, 600, tracking 0.16em).
- Line height: display 1.02, headings 1.1, body 1.6. Longest line of text: 38em.
- Labels are never used for anything a visitor must read to act: 13px is for small captions and kickers only.

## Shape and space

- Space on a 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Corners: 14, 22, 28 and pill. The recurring shapes are the **circle** and the **arch** (`--radius-arch`); use them for images and decoration, never to crop away words in a screenshot.
- Outlines are 2px (3px for emphasis) in ink. There are no drop shadows.

## Motion

- 150ms for hover and focus, 250ms for panels, ease `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- With `prefers-reduced-motion` the durations drop to near zero.

## Focus and states

- Focus ring: 3px rust, offset 3px, on every interactive element. Checked options change fill (mustard) and the tick, not only colour.
- Sample text in the builder: mustard-tinted field with a dashed outline, plus the words "sample text" in the counter.

## Voice

Plain words (see the glossary in the plan, E1.7): "block of your page", not "section"; "the editor", not "CMS"; "get your site", not "export".
