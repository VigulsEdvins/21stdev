/**
 * Small helpers shared by the assembler parts.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 * The code between the braces is not indented, so the template strings in it stay byte for byte as they were.
 */
(function () {
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const api = { escapeHtml };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmUtil = api;
})();
