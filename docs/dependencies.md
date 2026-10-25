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
