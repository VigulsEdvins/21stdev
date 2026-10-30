/* The server's check of a published script file (plan 2026-10-30-script-allowlist.md). A script is accepted only if it is EXACTLY what the builder's own
   generator would have produced: the file is read for its parameters (which blocks, in which order, which ids, the content-override data), rebuilt from
   those parameters with the real generator functions and the blocks' own script files, and compared byte for byte. Nothing is searched for; anything that is
   not library code, however small, makes the comparison fail.
   createScriptChecker({ library, exportAssets }) -> { check(text) } where library(slug) gives the text of that block's scripts file (features/<slug>/script.js) or null,
   and exportAssets() gives { slug: [urls] }, the files blocks load at run time (meta.json "exportAssets").

   One difference from the generator's output is expected and allowed: when the builder bundles a download it rewrites root-relative file addresses ("/assets/library/a.svg",
   and the folders of run-time files) to relative ones ("assets/library/a.svg") inside script.js (scripts/builder/export-assets.js). At each such place the upload may
   hold either form, and nothing else. */
const Asm = require('../../scripts/assembler/export.js');
const { isolateSectionScript } = require('../../scripts/assembler/section-isolation.js');
const SinglePages = require('../../scripts/builder/single-pages.js');
const FormDelivery = require('../../scripts/form-delivery.js');
const { LOCAL_ASSET_RE } = require('../../scripts/assembler/zip.js');

const P = Asm.scriptParts;
const ALL = '\u0001ALL\u0001', OV = '\u0001OV\u0001'; // stand-ins for the two parts that change from page to page
const SLUG_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-';
const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const OVERRIDE_TYPES = ['text', 'image', 'fit', 'alt', 'link', 'hide', 'shift', 'move', 'color'];
const OVERRIDE_KEYS = ['attr', 'field', 'section', 'selector', 'type', 'value'];

/** The language button's wiring, appended to a page's script when the page has translations. It is fixed text; ask the code that makes it. */
const LANG_WIRE = SinglePages.wireLanguageSwitcher('<ul class="lsw-menu"></ul>', [{ id: 'a', lang: 'en', slug: 'a', index: 0 }, { id: 'b', lang: 'lv', slug: 'b', index: 1 }], 'a', () => 'x.html').js;

const onlyChars = (text, chars, min, max) => text.length >= min && text.length <= max && [...text].every((c) => chars.includes(c));

/** The page-to-page parts of script.js around the two holes, for one dark/light flag and one form-delivery setting. */
function frame(isDark, delivery) {
  const full = P.renderExportScript({ isDark, safeSections: [], options: {}, allScripts: ALL, overridesJson: OV }, delivery ? FormDelivery.runtimeJs() : '');
  const [pre, rest] = full.split(ALL);
  const [mid, post] = rest.split(OV);
  if (full.split(ALL).length !== 2 || rest.split(OV).length !== 2) throw new Error('script frame: the stand-ins must each appear once');
  return { pre, mid, post };
}
const FRAMES = [];
for (const isDark of [true, false]) for (const delivery of [false, true]) FRAMES.push(Object.assign({ isDark, delivery }, frame(isDark, delivery)));

/** The path the bundler writes for a root-relative address (same rule as zipPathOf in scripts/builder/export-assets.js). */
function bundled(address) {
  let decoded = address;
  try { decoded = decodeURIComponent(address); } catch (_) { /* keep as it is */ }
  return decoded.startsWith('/assets/') ? decoded.slice(1) : 'assets' + decoded;
}

/** Where, in generator output, the bundler may have rewritten an address: [{ start, orig, alt }] in order, not overlapping. */
function sitesOf(expected, dirs) {
  const sites = [];
  for (const m of expected.matchAll(LOCAL_ASSET_RE)) sites.push({ start: m.index + m[1].length, orig: m[2], alt: bundled(m[2]) });
  const NAME = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-';
  for (const dir of dirs) { // a string literal that starts with the folder, then file-name characters up to the closing quote or a ${...} hole
    for (let at = expected.indexOf(dir); at >= 0; at = expected.indexOf(dir, at + 1)) {
      if (at === 0 || !'"\'`'.includes(expected[at - 1])) continue;
      let j = at + dir.length;
      while (j < expected.length && NAME.includes(expected[j])) j++;
      if ('"\'`'.includes(expected[j]) || (expected[j] === '$' && expected[j + 1] === '{')) sites.push({ start: at, orig: dir, alt: bundled(dir) });
    }
  }
  sites.sort((a, b) => a.start - b.start || b.orig.length - a.orig.length);
  const out = [];
  let end = 0;
  for (const s of sites) { if (s.start >= end) { out.push(s); end = s.start + s.orig.length; } }
  return out;
}

/** Does `text` hold `expected` at `pos`, allowing the bundler's rewrites? Returns the position after it, or -1. */
function advance(text, pos, expected, dirs) {
  let at = pos, from = 0;
  for (const s of sitesOf(expected, dirs)) {
    const seg = expected.slice(from, s.start);
    if (!text.startsWith(seg, at)) return -1;
    at += seg.length;
    if (text.startsWith(s.orig, at)) at += s.orig.length; else if (text.startsWith(s.alt, at)) at += s.alt.length; else return -1;
    from = s.start + s.orig.length;
  }
  const tail = expected.slice(from);
  return text.startsWith(tail, at) ? at + tail.length : -1;
}

/** The content overrides are data the page's own runtime applies. Same shape and rules as collectOverrides (scripts/assembler/pages.js), checked again here. */
function checkOverrides(list) {
  if (!Array.isArray(list) || list.length > 2000) return 'The page text changes are not in the expected form.';
  for (const o of list) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return 'A page text change is not in the expected form.';
    const keys = Object.keys(o).sort();
    if (keys.length !== OVERRIDE_KEYS.length || keys.some((k, i) => k !== OVERRIDE_KEYS[i]) || OVERRIDE_KEYS.some((k) => typeof o[k] !== 'string')) return 'A page text change is not in the expected form.';
    if (!OVERRIDE_TYPES.includes(o.type)) return 'A page text change has an unknown kind.';
    if (!onlyChars(o.section, ID_CHARS, 1, 64) || o.field.length > 160 || o.selector.length > 400 || o.value.length > 20000 || o.attr.length > 40) return 'A page text change is too long or malformed.';
    if (o.attr && !onlyChars(o.attr, 'abcdefghijklmnopqrstuvwxyz-', 1, 40)) return 'A page text change has a bad style name.';
    const probe = o.value.replace(/[\u0000- \u007f-\u009f]+/g, '').toLowerCase();
    if ((o.type === 'link' || o.type === 'image') && (/^(javascript|vbscript):/.test(probe) || (/^data:/.test(probe) && !/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/.test(probe)))) return 'A link or picture in the page text changes uses a script address.';
  }
  return '';
}

/** Reads one block starting at `pos`. Returns { next } (the position after a block that is exactly right) or { problem }. */
async function readBlock(text, pos, library, cache, dirs) {
  for (const fixed of [P.LAZY_SECTION_RUNTIME, P.modeScriptBlock(), P.langScriptBlock(), P.PRELOADER_DISMISS_EXPORT]) {
    const next = advance(text, pos, fixed, dirs);
    if (next >= 0) return { next };
  }
  const head = '  // Section: ';
  if (!text.startsWith(head, pos)) return { problem: 'A part of the page script is not one the builder makes.' };
  let i = pos + head.length;
  const slugStart = i;
  while (i < text.length && SLUG_CHARS.includes(text[i])) i++;
  const slug = text.slice(slugStart, i);
  if (!slug || slug.length > 80) return { problem: 'A block in the page script has no valid name.' };
  const lazyHead = ' (starts when it is close to the screen)\n  window.__lazySection(', plainHead = '\n  try {\n    window.__activeSectionRegisteringId = ';
  let lazy;
  if (text.startsWith(lazyHead, i)) { lazy = true; i += lazyHead.length; } else if (text.startsWith(plainHead, i)) { lazy = false; i += plainHead.length; } else return { problem: 'A block in the page script is not in the form the builder makes.' };
  if (text[i] !== '"') return { problem: 'A block in the page script has no valid id.' };
  const idEnd = text.indexOf('"', i + 1);
  const id = idEnd < 0 ? '' : text.slice(i + 1, idEnd);
  if (!onlyChars(id, ID_CHARS, 1, 64)) return { problem: 'A block in the page script has no valid id.' };
  if (!cache.has(slug)) cache.set(slug, await library(slug));
  const lib = cache.get(slug);
  if (typeof lib !== 'string') return { problem: 'The page script uses a block (“' + slug + '”) that is not in the library.' };
  const isolatedJs = isolateSectionScript(lib, id);
  if (!isolatedJs.trim()) return { problem: 'The page script has a block (“' + slug + '”) that has no script.' };
  const next = advance(text, pos, P.sectionScriptBlock({ slug, id, isolatedJs, lazy }), dirs);
  if (next < 0) return { problem: 'The script of the block “' + slug + '” is not the library\'s own.' };
  return { next };
}

function createScriptChecker({ library, exportAssets }) {
  const cache = new Map(); // the blocks' script texts, asked for once
  let dirsPromise = null;
  /** The folders blocks load files from at run time, as the bundler sees them (every block's, a superset of what one page needs). */
  const folders = () => (dirsPromise = dirsPromise || (async () => {
    const map = exportAssets ? await exportAssets() : {};
    return [...new Set(Object.values(map || {}).flat().filter((u) => typeof u === 'string' && u.startsWith('/') && u.includes('/')).map((u) => u.slice(0, u.lastIndexOf('/') + 1)))];
  })());

  /** Returns { ok: true } or { ok: false, problem } for the text of one .js file. */
  async function check(text) {
    if (typeof text !== 'string' || text.length > 5 * 1024 * 1024) return { ok: false, problem: 'The script is missing or too large.' };
    const dirs = await folders();
    let firstProblem = '';
    for (const f of FRAMES) {
      let pos = advance(text, 0, f.pre, dirs), blocks = 0, bad = '';
      if (pos < 0) continue;
      for (;;) {
        if (blocks > 0) {
          if (text.startsWith(f.mid, pos)) break; // (the part between the blocks and the data holds no addresses)
          if (!text.startsWith('\n\n', pos)) { bad = 'The page script has something in it the builder did not make.'; break; }
          pos += 2;
        }
        const r = await readBlock(text, pos, library, cache, dirs);
        if (r.problem) { bad = r.problem; break; }
        pos = r.next; blocks++;
        if (blocks > 500) { bad = 'The page script has too many blocks.'; break; }
      }
      if (bad) { firstProblem = firstProblem || bad; continue; }
      pos += f.mid.length;
      const rest = text.slice(pos);
      for (const wire of ['', LANG_WIRE]) {
        const tail = f.post + wire;
        let from = -1, tries = 0;
        while ((from = rest.indexOf(');', from + 1)) >= 0 && tries++ < 80) {
          const hole = rest.slice(0, from);
          let data;
          try { data = JSON.parse(hole); } catch (e) { continue; }
          if (advance(rest, from, tail, dirs) !== rest.length) continue;
          if (JSON.stringify(data, null, 2) !== hole) { firstProblem = firstProblem || 'The page text changes in the script are not in the form the builder writes.'; continue; }
          const why = checkOverrides(data);
          if (why) { firstProblem = firstProblem || why; continue; }
          return { ok: true };
        }
      }
      firstProblem = firstProblem || 'The end of the page script is not the one the builder makes.';
    }
    return { ok: false, problem: firstProblem || 'The page script does not start the way the builder\'s scripts do.' };
  }
  return { check };
}

module.exports = { createScriptChecker, checkOverrides, LANG_WIRE };
