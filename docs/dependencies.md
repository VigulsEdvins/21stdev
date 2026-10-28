# Dependencies

Checked 2026-10-24 with `npm audit --omit=dev`: 0 known vulnerabilities. CI runs the same command in the `reports` job.

| Package | Used for | Licence |
|---|---|---|
| react, react-dom | bundled into React components in `features/*/script.js` and the React project export | MIT |
| d3-geo | map components | ISC |
| gsap | animation in many components | GreenSock "Standard no-charge" licence (https://gsap.com/standard-license). Free for most sites; it restricts building tools that compete with GreenSock's own, so read it before selling a site builder built on this vault. |
| jszip, playwright-core, esbuild, acorn, eslint-scope, tailwindcss | development and tests only | MIT / BSD |

Updating: run `npm outdated`, update one package at a time, then `npm run verify`, `npm test`, `npm run test:e2e`. React and GSAP are bundled into many `script.js` files, so a major upgrade means re-running `bundle-demo` for the affected slugs, one at a time.

Lighthouse (`lighthouse`, dev only, Apache-2.0) runs in `npm run check-lighthouse` against exported starter sites; it is not part of any export.

`@ffmpeg-installer/ffmpeg` (dev only; its ffmpeg build includes x264 under the GPL) encodes the MP4 fallbacks for bundled WebM videos (`npm run encode-video-fallback`). It is a build tool: the encoded `.mp4` files are the only thing that ships.

WebKit for the cross-browser check: Playwright's cached WebKit needs ICU 74 and libxml2.so.2, which a newer Linux lacks. `npm run setup-webkit-libs` downloads those two packages from the Ubuntu 24.04 archive into `~/.cache/web-for-options/webkit-libs` (no root, nothing installed system-wide); `scripts/lib/webkit.js` puts them on the library path for the WebKit launch only.

## Third-party files in `site/examples/` (2026-10-28)

The three whole-website samples (`yearbook`, `arena`, `roster`) are copies of the folders `edv-yearbook`, `edv-arena` and `edv-roster` that sit next to this repo, made by `node scripts/build-examples.js`. The owner agreed to put them in the repo as an exception to the no-third-party-code rule. Third-party files inside:

| File | Where | Licence |
|---|---|---|
| `gsap.min.js`, `ScrollTrigger.min.js`, `Observer.min.js` (GSAP 3.13.0) | `arena/assets/vendor/`, `roster/assets/vendor/` | GreenSock Standard no-charge licence, https://gsap.com/standard-license (the same caveat as above: read it before selling a site builder that offers GSAP animations to customers) |
| `lenis.min.js` | `arena/assets/vendor/`, `roster/assets/vendor/` | Lenis is MIT licensed; the minified file carries no header, so confirm the version and add the notice from the upstream project before launch |

The yearbook has no library files. Google Fonts links in the arena page are removed by the build (no requests to Google; the page uses its own fallback fonts). Fonts under `roster/assets/fonts/` and images, audio and SVG in the three folders are the owner's own.

## Logos on the sign-in buttons (2026-10-28)

`site/account/index.html` carries two inline SVG marks on "Continue with Google" and "Continue with GitHub". The Google "G" is Google's own four-colour mark, used as Google's sign-in branding guidelines allow for a sign-in button next to the words "Continue with Google"; keep its colours and do not change the shape. The GitHub mark is the Octicons `mark-github` icon (MIT licence, GitHub), used as GitHub's logo guidelines allow for sign-in with GitHub. Both are inline (no request to either company, so the strict policy is unchanged) and hidden from screen readers because the words next to them say the same thing. If the buttons are restyled, check the current Google and GitHub brand pages first.

