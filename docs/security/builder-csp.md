# Content Security Policy for the builder (plan E16.7)

## Where it stands (measured 2026-10-29 with `node scripts/check-builder-csp.js`)

The storefront pages are already strict (`site/_headers`: no inline scripts or styles, own origin only, checked by `npm run check-headers` and `tests/e2e/csp.e2e.js`). The builder, `/builder/`, is not yet: its page carries its own `<meta>` policy that allows `'unsafe-inline'` scripts and styles and three script hosts, because the live preview needs them.

`site/_headers` now also sends the **strict policy as `Content-Security-Policy-Report-Only`** on `/builder/*`. It blocks nothing. `scripts/check-builder-csp.js` loads the builder under that policy, walks the guided steps and prints every violation:

| Where | Violations under the strict policy | Cause |
|---|---|---|
| The builder page itself | **none** (since jszip is hosted on our own origin: `scripts/vendor/jszip.min.js`, was cdnjs) | |
| The preview frame (`#previewFrame`, `srcdoc`) | 4 inline script elements, 3 inline style elements | The preview is built in the browser from the blocks' own scripts and styles. A `srcdoc` frame inherits the parent's policy |

So the builder page can be enforced today; the one thing in the way is the preview.

## The plan, in order

1. **Done:** self-host JSZip (also removes the network dependency for downloading).
2. **Report-only on the builder (done):** the line in `site/_headers`. Re-run the probe after any builder change; it should stay at "the preview frame only".
3. **Move the preview to its own document** (the real fix, also E16.5): serve `/builder/preview-frame.html` from the same files with its own header (`script-src 'self' 'unsafe-inline' <the three script hosts>`, `connect-src 'none'`, `form-action 'none'`), load it in an iframe whose `sandbox` has `allow-scripts` but **not** `allow-same-origin` (an opaque origin: the blocks' scripts can no longer read the builder's storage, session or DOM), and send it the assembled page with `postMessage`. Today's `allow-scripts allow-same-origin` pair lets a block's script remove the sandbox, so this also closes that gap.
   - Cost: every test that reads `previewFrame.contentDocument` directly (about 40 browser tests) must go through a small helper that asks the frame over `postMessage`. Do it in one slice with that helper first.
4. **Enforce the strict policy** as the builder's `Content-Security-Policy` header, delete the `<meta>` policy from `builder.html`, and keep `style-src-attr 'unsafe-inline'` for the 35 `style=` attributes (low risk; moving them to classes is optional).
5. **Add a reporting address** (`report-to`) once there is an endpoint; until then the browser console is the report.
6. **CI**: `check-builder-csp.js --json` fails when the builder page itself (not the preview frame) has a violation; once step 3 is done it fails on any violation.

## Not in scope here

Cross-origin isolation headers on the builder (breaks the cdn preview libraries), and an A-grade public header check on staging (needs the staging site: owner step, `npm run check-headers -- https://staging.edvlabs.com`).
